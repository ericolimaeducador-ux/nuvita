import { BadRequestException, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { AppConfigService } from '../../../common/security/config.service';
import { AUDIT_LOG_REPOSITORY, USER_REPOSITORY } from '../auth.constants';
import { AuditEvent } from '../domain/audit-event.enum';
import { AuditLogRepository } from './ports/audit-log.repository';
import { UserRepository } from './ports/user.repository';
import { RequestContext } from './auth.service';

export const PASSWORD_RESET_MAILER = 'PASSWORD_RESET_MAILER';
export const PASSWORD_RESET_LIMITER = 'PASSWORD_RESET_LIMITER';
export const PASSWORD_RESET_OPTIONS = 'PASSWORD_RESET_OPTIONS';

export interface PasswordResetMailer {
  enviarLinkRedefinicao(input: { email: string; nome: string; link: string; validadeMinutos: number }): Promise<void>;
}

export interface PasswordResetLimiter {
  /** false = limite por conta ou por IP estourado. */
  permitirPedido(ip: string, email: string): Promise<boolean>;
}

export interface PasswordResetOptions {
  /** Piso de tempo da resposta do pedido: o caminho "e-mail não cadastrado" não pode ser mais rápido. */
  tempoMinimoMs?: number;
  urlBase?: string;
}

const VALIDADE_MINUTOS = 45;
const BASE_PADRAO = 'https://psi.nuvita.app.br';
export const MENSAGEM_PEDIDO =
  'Se este e-mail estiver cadastrado, enviamos um link para redefinir a senha. Ele vale por 45 minutos.';
const LINK_INVALIDO = 'Link invalido ou expirado.';

const sha256 = (valor: string) => createHash('sha256').update(valor).digest('hex');
const pausa = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * "Esqueci minha senha" por e-mail. A resposta do pedido é IDÊNTICA para e-mail cadastrado e não
 * cadastrado; o token tem 256 bits, vive só como hash, vale 45 min e é de uso único. Redefinir NÃO
 * mexe no 2FA: perda do 2FA continua só pelo super-admin.
 */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    @Inject(PASSWORD_RESET_MAILER) private readonly mailer: PasswordResetMailer,
    @Inject(PASSWORD_RESET_LIMITER) private readonly limiter: PasswordResetLimiter,
    private readonly configService: AppConfigService,
    // Opcional: o Nest não injeta um objeto de opções sem token (sem isto, o container não sobe).
    @Optional() @Inject(PASSWORD_RESET_OPTIONS) private readonly options: PasswordResetOptions = {},
  ) {}

  async solicitar(emailInformado: string, context: RequestContext): Promise<{ ok: true; mensagem: string }> {
    const piso = pausa(this.options.tempoMinimoMs ?? 1200);
    try {
      await this.processarPedido(emailInformado.trim().toLowerCase(), context);
    } catch (erro) {
      // Nunca vaza o motivo: a resposta é a mesma. A falha fica no log do servidor.
      this.logger.error(`Falha ao processar pedido de redefinicao de senha: ${(erro as Error).message}`);
    }
    await piso;
    return { ok: true, mensagem: MENSAGEM_PEDIDO };
  }

  async redefinir(token: string, novaSenha: string, context: RequestContext): Promise<{ ok: true }> {
    const passwordHash = await bcrypt.hash(novaSenha, this.configService.getConfig().bcryptRounds);
    const user =
      token && token.length >= 20
        ? await this.users.redefinirSenhaComToken(sha256(token), passwordHash, new Date())
        : null;

    if (!user) {
      await this.auditar(AuditEvent.PASSWORD_RESET_FAILED, context, undefined, undefined, 'FALHA');
      throw new BadRequestException(LINK_INVALIDO);
    }

    await this.auditar(AuditEvent.PASSWORD_RESET_COMPLETED, context, user.id, user.email, 'SUCESSO');
    return { ok: true };
  }

  /** Reset de senha ou de 2FA feito pelo super-admin: fica no mesmo trilho de auditoria. */
  async registrarResetPeloAdmin(
    tipo: 'SENHA' | '2FA',
    alvo: { id: string; email?: string },
    ator: { userId: string; email?: string },
    context: RequestContext,
  ): Promise<void> {
    await this.auditLogs.create({
      event: tipo === 'SENHA' ? AuditEvent.PASSWORD_RESET_BY_ADMIN : AuditEvent.TWO_FACTOR_RESET_BY_ADMIN,
      userId: alvo.id,
      email: alvo.email,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { caminho: 'SUPER_ADMIN', resultado: 'SUCESSO', realizadoPor: ator.userId, realizadoPorEmail: ator.email },
    });
  }

  /** Pedidos e conclusões recentes (autoatendimento e super-admin), para ver quem está travado no beta. */
  async listarRecentes(limite = 100) {
    const eventos = await this.auditLogs.listarPorEventos(
      [
        AuditEvent.PASSWORD_RESET_REQUESTED,
        AuditEvent.PASSWORD_RESET_COMPLETED,
        AuditEvent.PASSWORD_RESET_FAILED,
        AuditEvent.PASSWORD_RESET_BY_ADMIN,
        AuditEvent.TWO_FACTOR_RESET_BY_ADMIN,
      ],
      Math.min(limite, 200),
    );
    return eventos.map((e) => ({
      evento: e.event,
      quando: e.timestamp,
      email: e.email,
      caminho: e.metadata?.['caminho'],
      resultado: e.metadata?.['resultado'],
    }));
  }

  private async processarPedido(email: string, context: RequestContext): Promise<void> {
    const permitido = await this.limiter.permitirPedido(context.ip, email);
    if (!permitido) {
      await this.auditar(AuditEvent.PASSWORD_RESET_REQUESTED, context, undefined, email, 'LIMITE');
      return;
    }

    const user = await this.users.findByEmail(email);
    if (!user || !user.ativo) {
      await this.auditar(AuditEvent.PASSWORD_RESET_REQUESTED, context, undefined, email, 'EMAIL_NAO_CADASTRADO');
      return;
    }

    const token = randomBytes(32).toString('base64url');
    const expiraEm = new Date(Date.now() + VALIDADE_MINUTOS * 60 * 1000);
    await this.users.salvarResetSenha(user.id, sha256(token), expiraEm);

    const base = this.options.urlBase ?? this.configService.getConfig().corsOrigin?.[0] ?? BASE_PADRAO;
    try {
      await this.mailer.enviarLinkRedefinicao({
        email: user.email,
        nome: user.nome,
        link: `${base}/redefinir-senha?token=${token}`,
        validadeMinutos: VALIDADE_MINUTOS,
      });
    } catch (erro) {
      this.logger.error(`Falha ao enviar e-mail de redefinicao: ${(erro as Error).message}`);
      await this.auditar(AuditEvent.PASSWORD_RESET_REQUESTED, context, user.id, user.email, 'FALHA_ENVIO');
      return;
    }
    await this.auditar(AuditEvent.PASSWORD_RESET_REQUESTED, context, user.id, user.email, 'ENVIADO');
  }

  private async auditar(
    event: AuditEvent,
    context: RequestContext,
    userId: string | undefined,
    email: string | undefined,
    resultado: string,
  ): Promise<void> {
    await this.auditLogs.create({
      event,
      userId,
      email,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { caminho: 'AUTOATENDIMENTO', resultado },
    });
  }
}
