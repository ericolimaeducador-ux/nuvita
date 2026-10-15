import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../../common/security/config.service';
import { NotificacaoSender, SendNotificacaoInput } from '../../application/ports/notificacao-sender';
import { CanalNotificacao } from '../../domain/notificacao.entity';

const DOMINIO_REMETENTE = 'psi.nuvita.app.br';
const REMETENTE_NOME_PADRAO = 'Nuvita Psi';
const REMETENTE_EMAIL_PADRAO = `avisos@${DOMINIO_REMETENTE}`;
const REPLY_TO = 'contato@nuvita.app.br';

interface Remetente {
  nome: string;
  email: string;
}

@Injectable()
export class EmailSender implements NotificacaoSender {
  private readonly logger = new Logger(EmailSender.name);
  private avisouRemetenteInvalido = false;

  constructor(private readonly configService: AppConfigService) {}

  supports(canal: CanalNotificacao): boolean {
    return canal === CanalNotificacao.EMAIL;
  }

  async send(input: SendNotificacaoInput): Promise<void> {
    const provider = this.configService.getConfig().emailProvider ?? 'resend';
    if (provider === 'sendgrid') {
      await this.sendSendGrid(input);
      return;
    }

    await this.sendResend(input);
  }

  private async sendResend(input: SendNotificacaoInput): Promise<void> {
    const apiKey = this.requireConfig(this.configService.getConfig().resendApiKey, 'RESEND_API_KEY');
    const remetente = this.resolveRemetente();
    await this.post('https://api.resend.com/emails', {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }, {
      from: `${remetente.nome} <${remetente.email}>`,
      reply_to: REPLY_TO,
      to: input.conteudo.destino,
      subject: this.assuntoSeguro(input.conteudo.assunto),
      text: input.conteudo.mensagem,
      ...(input.conteudo.responderPara ? { reply_to: input.conteudo.responderPara } : {}),
    });
  }

  private async sendSendGrid(input: SendNotificacaoInput): Promise<void> {
    const apiKey = this.requireConfig(this.configService.getConfig().sendgridApiKey, 'SENDGRID_API_KEY');
    const remetente = this.resolveRemetente();
    await this.post('https://api.sendgrid.com/v3/mail/send', {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }, {
      personalizations: [{ to: [{ email: input.conteudo.destino }] }],
      from: { email: remetente.email, name: remetente.nome },
      reply_to: { email: input.conteudo.responderPara ?? REPLY_TO },
      subject: this.assuntoSeguro(input.conteudo.assunto),
      content: [{ type: 'text/plain', value: input.conteudo.mensagem }],
    });
  }

  /**
   * EMAIL_FROM só vale se for do domínio verificado no Resend e não for no-reply/noreply;
   * caso contrário usa o padrão e registra aviso (sem imprimir o valor configurado).
   */
  private resolveRemetente(): Remetente {
    const configurado = this.configService.getConfig().emailFrom;
    const parsed = this.parseRemetente(configurado);
    if (parsed) return parsed;

    if (!this.avisouRemetenteInvalido) {
      this.avisouRemetenteInvalido = true;
      this.logger.warn(
        `EMAIL_FROM ausente, fora do domínio ${DOMINIO_REMETENTE} ou no-reply: usando remetente padrão.`,
      );
    }
    return { nome: REMETENTE_NOME_PADRAO, email: REMETENTE_EMAIL_PADRAO };
  }

  private parseRemetente(valor: string | undefined): Remetente | null {
    // eslint-disable-next-line no-control-regex
    if (!valor || /[\u0000-\u001f]/.test(valor)) return null;
    const match = valor.trim().match(/^(?:(.*?)\s*<([^<>\s]+)>|([^<>\s]+))$/);
    if (!match) return null;

    const email = (match[2] ?? match[3] ?? '').toLowerCase();
    const nome = (match[1] ?? '').replace(/^"|"$/g, '').trim() || REMETENTE_NOME_PADRAO;
    const [local, dominio, ...resto] = email.split('@');
    if (!local || dominio !== DOMINIO_REMETENTE || resto.length > 0) return null;
    if (/no-?reply/i.test(email)) return null;

    return { nome, email };
  }

  /** Anti header injection: assunto vindo de dado de usuário nunca carrega CR/LF. */
  private assuntoSeguro(assunto: string | undefined): string {
    // eslint-disable-next-line no-control-regex
    const limpo = (assunto ?? '').replace(/[\r\n\u0000-\u001f\u007f]+/g, ' ').trim();
    return limpo || 'Notificacao';
  }

  private async post(url: string, headers: Record<string, string>, body: unknown): Promise<void> {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Email provider failed with HTTP ${response.status}: ${await response.text()}`);
    }
  }

  private requireConfig(value: string | undefined, name: string): string {
    if (!value) {
      throw new Error(`Missing notification provider configuration: ${name}`);
    }

    return value;
  }
}
