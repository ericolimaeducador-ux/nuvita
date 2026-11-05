import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { exigeTwoFactor, Modulo, Papel } from '../../../../../packages/shared/src/auth';
import { normalizarDocumentoFiscal } from '../../../../../packages/shared/src/documentos';
import { USER_REPOSITORY } from '../auth/auth.constants';
import { UserRepository } from '../auth/application/ports/user.repository';
import { AuditEvent } from '../auth/domain/audit-event.enum';
import { toPublicUser } from '../auth/domain/user.entity';
import { AppConfigService } from '../../common/security/config.service';
import { gerarSenhaTemporaria } from '../../common/security/gerar-senha-temporaria';
import { CLINICA_REPOSITORY } from '../clinicas/clinicas.constants';
import { ClinicaRepository, UpdateClinicaInput } from '../clinicas/application/ports/clinica.repository';
import { Clinica } from '../clinicas/domain/clinica.entity';
import { ClinicasService } from '../clinicas/application/clinicas.service';
import { ListUsersQueryDto } from './application/dto/list-users-query.dto';
import { UpdateUserDto } from './application/dto/update-user.dto';
import { CreateAdminUserDto } from './application/dto/create-admin-user.dto';
import { CriarClinicaDto } from './application/dto/criar-clinica.dto';
import { UpdateClinicaDto } from './application/dto/update-clinica.dto';

export interface CriarClinicaContext {
  ip: string;
  userAgent: string;
  userId: string;
}

@Injectable()
export class SuperAdminService {
  private readonly logger = new Logger(SuperAdminService.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(CLINICA_REPOSITORY) private readonly clinicas: ClinicaRepository,
    private readonly configService: AppConfigService,
    private readonly clinicasService: ClinicasService,
  ) {}

  /**
   * Cria uma clínica nova + o primeiro ADMIN dela pela UI do super-admin
   * (feature-super-admin-clinic-onboarding). Reaproveita o onboard() já
   * testado; a senha do admin é GERADA aqui (nunca digitada pelo super-admin)
   * e o admin nasce com troca obrigatória no 1º login.
   *
   * Retorna a senha temporária e o 2FA UMA vez — o super-admin repassa ao
   * cliente por fora (hoje: WhatsApp).
   */
  async criarClinica(dto: CriarClinicaDto, context: CriarClinicaContext) {
    // Sem primeiroAdmin (feature-clinica-sem-admin) não há senha a gerar nem 2FA a devolver.
    const admin = dto.primeiroAdmin;
    const senhaTemporaria = admin ? gerarSenhaTemporaria() : undefined;

    const result = await this.clinicasService.onboard(
      {
        nome: dto.clinica.nome,
        documento: dto.clinica.documento,
        tipoDocumento: dto.clinica.tipoDocumento,
        faseTeste: dto.clinica.faseTeste,
        plano: dto.clinica.plano,
        configuracoes: {
          fusoHorario: dto.clinica.fusoHorario,
          duracaoConsultaPadrao: dto.clinica.duracaoConsultaPadrao,
          telefone: dto.clinica.telefone,
          emailContato: dto.clinica.emailContato,
        },
        ...(admin && senhaTemporaria
          ? { primeiroAdmin: { nome: admin.nome!, email: admin.email!, password: senhaTemporaria } }
          : {}),
      },
      { ip: context.ip, userAgent: context.userAgent },
      { deveTrocarSenha: true, atorUserId: context.userId },
    );

    return {
      clinica: result.clinica,
      admin: result.admin,
      senhaTemporaria,
      // otpauthUrl: o painel desenha o QR code a partir dela (mesmo segredo do base32).
      twoFactorSetup: result.twoFactorSetup
        ? { base32: result.twoFactorSetup.base32, otpauthUrl: result.twoFactorSetup.otpauthUrl }
        : undefined,
    };
  }

  async listClinicas() {
    const clinicas = await this.clinicas.findAll();
    // Total de usuários por clínica ajuda o super-admin a enxergar o que
    // cada uma tem antes de mexer (contagem barata: poucas clínicas).
    const items = await Promise.all(
      clinicas.map(async (clinica) => ({
        ...clinica,
        totalUsuarios: await this.users.count({ clinicaId: clinica.id }),
      })),
    );
    return { items, total: items.length };
  }

  async updateClinica(id: string, dto: UpdateClinicaDto, context?: CriarClinicaContext) {
    const camposContato = (['telefone', 'emailContato'] as const).filter((campo) => dto[campo] !== undefined);
    // Estado anterior quando há auditoria de contato ou 2º passo (propagação aos usuários): é o que a compensação restaura.
    const corrigeDocumento = dto.documento !== undefined && dto.tipoDocumento !== undefined;
    const antes =
      camposContato.length > 0 || dto.faseTeste !== undefined || corrigeDocumento
        ? await this.clinicas.findById(id)
        : null;

    if (corrigeDocumento) {
      if (!antes) throw new NotFoundException('Clínica não encontrada.');
      // Mesma garantia do create: nenhum CPF/CNPJ em duas clínicas (a própria clínica não conta).
      const dona = await this.clinicas.findByDocumento(dto.documento!);
      if (dona && dona.id !== id) throw new ConflictException(`${dto.tipoDocumento} já cadastrado.`);
    }

    const updated = await this.clinicas.update(id, dto);
    if (!updated) throw new NotFoundException('Clínica não encontrada.');
    // A marcação de fase de teste vale para todos os usuários da clínica: é ela que
    // decide qual termo eles aceitam (ver versaoTermosExigida). São dois passos sem transação
    // (clínica, depois usuários): se o 2º falha, a edição inteira é desfeita para que clínica e
    // usuários nunca divirjam.
    if (dto.faseTeste !== undefined) {
      try {
        await this.users.definirFaseTesteDaClinica(id, dto.faseTeste);
      } catch (error) {
        await this.desfazerEdicaoDaClinica(id, antes, dto);
        throw error;
      }
    }
    if (corrigeDocumento && antes && context) {
      await this.clinicasService.registrarAuditoriaAdministrativa({
        event: AuditEvent.CLINIC_FISCAL_DOCUMENT_UPDATED,
        userId: context.userId,
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: {
          clinicaId: id,
          antes: { tipoDocumento: antes.tipoDocumento, documento: normalizarDocumentoFiscal(antes.documento) },
          depois: { tipoDocumento: dto.tipoDocumento, documento: normalizarDocumentoFiscal(dto.documento!) },
        },
      });
    }
    if (camposContato.length > 0 && context) {
      await this.clinicasService.registrarAuditoriaAdministrativa({
        event: AuditEvent.CLINIC_CONTACT_UPDATED,
        userId: context.userId,
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: {
          clinicaId: id,
          campos: camposContato,
          antes: Object.fromEntries(camposContato.map((c) => [c, antes?.configuracoes[c]])),
          depois: Object.fromEntries(camposContato.map((c) => [c, dto[c]])),
        },
      });
    }
    return updated;
  }

  /** Compensação do updateClinica: devolve a clínica e os usuários ao estado anterior (melhor esforço, logado). */
  private async desfazerEdicaoDaClinica(
    id: string,
    antes: Clinica | null,
    dto: UpdateClinicaDto,
  ): Promise<void> {
    if (!antes) return;
    try {
      const restaurar: UpdateClinicaInput = {};
      if (dto.nome !== undefined) restaurar.nome = antes.nome;
      if (dto.plano !== undefined) restaurar.plano = antes.plano;
      if (dto.ativo !== undefined) restaurar.ativo = antes.ativo;
      if (dto.faseTeste !== undefined) restaurar.faseTeste = antes.faseTeste;
      if (dto.telefone !== undefined) restaurar.telefone = antes.configuracoes.telefone;
      if (dto.emailContato !== undefined) restaurar.emailContato = antes.configuracoes.emailContato;
      if (dto.documento !== undefined) restaurar.documento = antes.documento;
      if (dto.tipoDocumento !== undefined) restaurar.tipoDocumento = antes.tipoDocumento;
      await this.clinicas.update(id, restaurar);
      // A propagação pode ter falhado no meio (updateMany parcial): reaplica o valor anterior a todos.
      await this.users.definirFaseTesteDaClinica(id, antes.faseTeste);
    } catch (compensacaoErro) {
      this.logger.error(
        JSON.stringify({
          level: 'error',
          event: 'clinica_fase_teste_compensacao_falhou',
          clinicaId: id,
          erro: compensacaoErro instanceof Error ? compensacaoErro.message : String(compensacaoErro),
        }),
      );
    }
  }

  /** Fase de teste herdada da clínica do usuário; sem clínica = fora do teste. */
  private async faseTesteDaClinica(clinicaId: string | null | undefined): Promise<boolean> {
    if (!clinicaId) return false;
    const clinica = await this.clinicas.findById(clinicaId);
    return clinica?.faseTeste ?? false;
  }

  async listUsuarios(query: ListUsersQueryDto) {
    const { skip = 0, limit = 50, papel, clinicaId, ativo, search } = query;
    const filters = { papel, clinicaId, ativo, search };
    const [items, total] = await Promise.all([
      this.users.findAll(filters, skip, limit),
      this.users.count(filters),
    ]);
    return { items: items.map(toPublicUser), total, skip, limit };
  }

  async getUsuario(id: string) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return toPublicUser(user);
  }

  async createUsuario(dto: CreateAdminUserDto, context?: CriarClinicaContext) {
    const email = dto.email.toLowerCase();
    const existing = await this.users.findByEmail(email);
    if (existing) throw new ConflictException('E-mail já cadastrado.');

    const { bcryptRounds } = this.configService.getConfig();
    const passwordHash = await bcrypt.hash(dto.password, bcryptRounds);

    // Papéis com 2FA obrigatório precisam nascer com o secret, senão o login
    // fica impossível (o guard exige TOTP mas não há segredo cadastrado).
    const twoFactorSetup = this.buildTwoFactorSetup(dto.papel, email);
    const user = await this.users.create({
      nome: dto.nome,
      email,
      passwordHash,
      papel: dto.papel,
      clinicaId: dto.clinicaId ?? null,
      twoFactorSecret: twoFactorSetup?.base32,
      registroProfissional: dto.registroProfissional,
      // O COREN informado na criação do ENFERMEIRO é o do perfil (fonte única do carimbo no prontuário).
      ...(dto.papel === Papel.ENFERMEIRO && dto.coren?.trim() ? { coren: dto.coren.trim() } : {}),
      faseTeste: await this.faseTesteDaClinica(dto.clinicaId),
      // Amendment (2026-09-11) em feature-forced-password-change.md: mesma
      // regra do ClinicasService.createUsuario() — ENFERMEIRO criado aqui
      // (endpoint genérico do super-admin, qualquer clínica) também nasce
      // com troca obrigatória de senha.
      deveTrocarSenha: true,
    });

    // Quem criou, quando (timestamp do audit log), qual papel, qual COREN. Nunca senha nem segredo do 2FA.
    if (context) {
      await this.clinicasService.registrarAuditoriaAdministrativa({
        event: AuditEvent.USER_CREATED_BY_SUPER_ADMIN,
        userId: context.userId,
        ...(user.clinicaId ? { clinicaId: user.clinicaId } : {}),
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: {
          createdUserId: user.id,
          createdUserEmail: user.email,
          createdUserPapel: user.papel,
          createdUserCoren: user.coren ?? null,
        },
      });
    }

    return { ...toPublicUser(user), twoFactorSetup };
  }

  async updateUsuario(id: string, dto: UpdateUserDto, context?: CriarClinicaContext) {
    const current = await this.users.findById(id);
    if (!current) throw new NotFoundException('Usuário não encontrado.');

    // Troca de e-mail (ex.: usuário perdeu acesso à caixa antiga): normaliza
    // e garante que o novo endereço não pertence a outra conta.
    let novoEmail: string | undefined;
    if (dto.email) {
      const emailNormalizado = dto.email.toLowerCase();
      if (emailNormalizado !== current.email) {
        const existing = await this.users.findByEmail(emailNormalizado);
        if (existing && existing.id !== id) {
          throw new ConflictException('E-mail já cadastrado por outro usuário.');
        }
        novoEmail = emailNormalizado;
      }
    }

    // Se a mudança de papel passa a exigir 2FA e o usuário ainda não tem
    // secret, gera um agora para não travar o próximo login.
    let twoFactorSetup: ReturnType<SuperAdminService['buildTwoFactorSetup']>;
    if (dto.papel && exigeTwoFactor(dto.papel)) {
      const withSecrets = await this.users.findByEmailWithSecrets(current.email);
      if (!withSecrets?.twoFactorSecret) {
        twoFactorSetup = this.buildTwoFactorSetup(dto.papel, current.email);
      }
    }

    // O módulo SUPER_ADMIN nunca é concedível por checkbox: só o papel dá acesso.
    const papelFinal = dto.papel ?? current.papel;
    const modulosConcedidos =
      papelFinal === Papel.SUPER_ADMIN
        ? dto.modulosConcedidos
        : dto.modulosConcedidos?.filter((m) => m !== Modulo.SUPER_ADMIN);

    // Mudou de clínica: passa a seguir a fase de teste da clínica nova.
    const faseTeste =
      dto.clinicaId !== undefined ? await this.faseTesteDaClinica(dto.clinicaId) : undefined;

    const updated = await this.users.update(id, {
      ...dto,
      email: novoEmail,
      ...(faseTeste !== undefined ? { faseTeste } : {}),
      ...(modulosConcedidos !== undefined ? { modulosConcedidos } : {}),
      ...(twoFactorSetup ? { twoFactorSecret: twoFactorSetup.base32 } : {}),
    });
    if (!updated) throw new NotFoundException('Usuário não encontrado.');
    // Correção do COREN pelo super-admin: sempre permitida, sempre auditada (anterior/novo).
    if (dto.coren !== undefined && dto.coren !== current.coren && context) {
      await this.clinicasService.registrarAuditoriaAdministrativa({
        event: AuditEvent.USER_COREN_CORRECTED,
        userId: context.userId,
        ip: context.ip,
        userAgent: context.userAgent,
        metadata: { alvoUserId: id, corenAnterior: current.coren, corenNovo: dto.coren },
      });
    }
    return { ...toPublicUser(updated), twoFactorSetup };
  }

  private buildTwoFactorSetup(
    papel: Papel,
    email: string,
  ): { required: true; otpauthUrl: string; base32: string } | undefined {
    if (!exigeTwoFactor(papel)) {
      return undefined;
    }

    const issuer = this.configService.getConfig().totpIssuer;
    const secret = speakeasy.generateSecret({
      issuer,
      name: `${issuer}:${email}`,
      length: 32,
    });

    return {
      required: true,
      otpauthUrl: secret.otpauth_url ?? '',
      base32: secret.base32,
    };
  }

  /**
   * Regenera o segredo TOTP do usuário e devolve a chave UMA vez para o
   * super-admin repassar (Google Authenticator). Nunca expomos o segredo
   * já gravado: se a chave se perdeu, o caminho é gerar outra — a anterior
   * deixa de valer no próximo login.
   */
  async reset2fa(id: string) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    if (!exigeTwoFactor(user.papel)) {
      throw new BadRequestException('Este papel não usa 2FA.');
    }

    const setup = this.buildTwoFactorSetup(user.papel, user.email)!;
    const updated = await this.users.update(id, { twoFactorSecret: setup.base32 });
    if (!updated) throw new NotFoundException('Usuário não encontrado.');

    return { otpauthUrl: setup.otpauthUrl, base32: setup.base32 };
  }

  async resetPassword(id: string, novaSenha: string) {
    const { bcryptRounds } = this.configService.getConfig();
    const passwordHash = await bcrypt.hash(novaSenha, bcryptRounds);
    // Senha definida pelo super-admin é PROVISÓRIA: a pessoa troca no próximo acesso e as sessões antigas caem.
    const updated = await this.users.update(id, {
      passwordHash,
      deveTrocarSenha: true,
      tokensValidosApartirDe: new Date(),
    });
    if (!updated) throw new NotFoundException('Usuário não encontrado.');
    return { ok: true };
  }
}
