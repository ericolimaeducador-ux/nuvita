import {
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { AppConfigService } from '../../../common/security/config.service';
import { AuthTokenPayload, exigeTwoFactor, Papel } from '../../../../../../packages/shared/src/auth';
import { AUDIT_LOG_REPOSITORY, USER_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository, CreateAuditLogInput } from '../../auth/application/ports/audit-log.repository';
import { UserRepository } from '../../auth/application/ports/user.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { PublicUser, toPublicUser } from '../../auth/domain/user.entity';
import { DocumentStorage } from '../../documentos/application/ports/document-storage';
import { CLINICA_REPOSITORY, LOGO_READ_URL_TTL_SECONDS } from '../clinicas.constants';
import { Clinica, EnderecoClinica, LIMITES_POR_PLANO } from '../domain/clinica.entity';
import { mascararDocumentoFiscal, TipoDocumentoFiscal } from '../../../../../../packages/shared/src/documentos';
import { PreencherDocumentoDto } from './dto/preencher-documento.dto';
import { CreateClinicaUsuarioDto } from './dto/create-clinica-usuario.dto';
import { CreateClinicaDto } from './dto/create-clinica.dto';
import { ClinicaRepository } from './ports/clinica.repository';

/** Contrato de GET /clinicas/minha: só o necessário para o timbre dos documentos clínicos. */
export interface MinhaClinica {
  nome: string;
  documento: string;
  tipoDocumento: TipoDocumentoFiscal;
  endereco?: EnderecoClinica;
  telefone?: string;
  emailContato?: string;
  logoUrl?: string;
}

const MSG_DOCUMENTO_NAO_SALVO = 'Não foi possível salvar. Confirme o número ou fale com o suporte.';

/** Criação de clínica (onboard): o documento é opcional só aqui; o DTO do ADMIN/CLI (CreateClinicaDto) continua exigindo. */
export type OnboardClinicaInput = Omit<CreateClinicaDto, 'documento' | 'tipoDocumento' | 'primeiroAdmin'> & {
  documento?: string;
  tipoDocumento?: TipoDocumentoFiscal;
  /** Opcional só aqui (feature-clinica-sem-admin): sem ele a clínica nasce sozinha; o DTO da CLI continua exigindo. */
  primeiroAdmin?: CreateClinicaDto['primeiroAdmin'];
};

type OnboardAdmin = { id: string; nome: string; email: string; papel: Papel; clinicaId?: string | null };

interface OnboardResultado {
  clinica: Clinica;
  admin?: OnboardAdmin;
  limites: (typeof LIMITES_POR_PLANO)[Clinica['plano']];
  twoFactorSetup?: { required: true; otpauthUrl: string; base32: string };
}

export interface OnboardingContext {
  ip: string;
  userAgent: string;
}

/** Opções do onboard vindas de quem NÃO é a CLI (hoje: painel do super-admin). */
export interface OnboardingOptions {
  /** Admin nasce com troca de senha obrigatória (senha temporária gerada). */
  deveTrocarSenha?: boolean;
  /** Quem disparou a criação — atribui o CLINIC_CREATED a ele, não ao admin criado. */
  atorUserId?: string;
}

export interface ClinicAdminContext extends OnboardingContext {
  user: AuthTokenPayload;
}

@Injectable()
export class ClinicasService {
  private readonly logger = new Logger(ClinicasService.name);

  constructor(
    @Inject(CLINICA_REPOSITORY) private readonly clinicas: ClinicaRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    private readonly configService: AppConfigService,
    @Inject('DOCUMENT_STORAGE') private readonly storage: DocumentStorage,
  ) {}

  // Com primeiroAdmin o resultado sempre traz o admin; sem ele, não.
  async onboard(
    dto: OnboardClinicaInput & { primeiroAdmin: CreateClinicaDto['primeiroAdmin'] },
    context: OnboardingContext,
    options?: OnboardingOptions,
  ): Promise<OnboardResultado & { admin: OnboardAdmin }>;
  async onboard(dto: OnboardClinicaInput, context: OnboardingContext, options?: OnboardingOptions): Promise<OnboardResultado>;
  async onboard(dto: OnboardClinicaInput, context: OnboardingContext, options?: OnboardingOptions): Promise<OnboardResultado> {
    // O documento é opcional na criação (feature-clinic-fiscal-document-first-use): sem ele não há o que checar.
    const existingClinic = dto.documento ? await this.clinicas.findByDocumento(dto.documento) : null;
    if (existingClinic) {
      throw new ConflictException(`${dto.tipoDocumento} já cadastrado.`);
    }

    const primeiroAdmin = dto.primeiroAdmin;
    if (primeiroAdmin) {
      const existingUser = await this.users.findByEmail(primeiroAdmin.email.toLowerCase());
      if (existingUser) {
        throw new ConflictException('Email do primeiro admin ja cadastrado.');
      }
    }

    const clinica = await this.clinicas.create({
      nome: dto.nome,
      documento: dto.documento,
      tipoDocumento: dto.tipoDocumento,
      faseTeste: dto.faseTeste ?? false,
      endereco: dto.endereco,
      plano: dto.plano,
      configuracoes: dto.configuracoes,
    });

    // Sem primeiroAdmin (feature-clinica-sem-admin) a clínica nasce sozinha: não há usuário a criar nem a compensar.
    let admin;
    let twoFactorSetup: ReturnType<ClinicasService['buildTwoFactorSetup']>;
    if (primeiroAdmin) {
      const adminEmail = primeiroAdmin.email.toLowerCase();
      twoFactorSetup = this.buildTwoFactorSetup(Papel.ADMIN, adminEmail);
      try {
        admin = await this.users.create({
          nome: primeiroAdmin.nome,
          email: adminEmail,
          passwordHash: await this.hashPassword(primeiroAdmin.password),
          papel: Papel.ADMIN,
          clinicaId: clinica.id,
          twoFactorSecret: twoFactorSetup?.base32,
          deveTrocarSenha: options?.deveTrocarSenha,
          faseTeste: clinica.faseTeste,
        });
      } catch (error) {
        // Clínica sem admin por falha é lixo — compensa para não deixar órfã. Se a
        // compensação também falhar, sobra limpeza manual.
        this.logEventoObservabilidade('error', {
          msg: 'Onboarding de clinica falhou ao criar o primeiro admin; compensando a clinica criada.',
          event: 'onboarding_partial_failure',
          stage: 'create_admin',
          clinicaId: clinica.id,
          userId: options?.atorUserId ?? null,
        });
        await this.clinicas.delete(clinica.id).catch((cleanupError) => {
          this.logEventoObservabilidade('error', {
            msg: `Compensacao da clinica orfa falhou; limpeza manual necessaria. ${cleanupError}`,
            event: 'onboarding_partial_failure',
            stage: 'compensate_clinic',
            clinicaId: clinica.id,
            userId: options?.atorUserId ?? null,
          });
        });
        throw error;
      }
    }

    await this.auditLogs.create({
      event: AuditEvent.CLINIC_CREATED,
      userId: options?.atorUserId ?? admin?.id,
      // Sem admin não há e-mail a registrar: o campo fica vazio, nunca inventado.
      ...(admin ? { email: admin.email } : {}),
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: {
        clinicaId: clinica.id,
        plano: clinica.plano,
        ...(options?.atorUserId && admin ? { adminId: admin.id } : {}),
      },
    });

    return {
      clinica,
      ...(admin
        ? { admin: { id: admin.id, nome: admin.nome, email: admin.email, papel: admin.papel, clinicaId: admin.clinicaId } }
        : {}),
      limites: LIMITES_POR_PLANO[clinica.plano],
      twoFactorSetup,
    };
  }

  async createUsuario(
    clinicaIdParam: string,
    dto: CreateClinicaUsuarioDto,
    context: ClinicAdminContext,
  ): Promise<{
    user: PublicUser;
    twoFactorSetup?: { required: true; otpauthUrl: string; base32: string };
  }> {
    const adminClinicaId = context.user.clinicaId;
    if (!adminClinicaId || adminClinicaId !== clinicaIdParam) {
      throw new ForbiddenException('Admin so pode criar usuarios da propria clinica.');
    }

    if (![Papel.ENFERMEIRO, Papel.SECRETARIA].includes(dto.papel)) {
      throw new ForbiddenException('Admin da clinica so pode criar ENFERMEIRO ou SECRETARIA.');
    }

    const clinica = await this.clinicas.findById(adminClinicaId);
    if (!clinica || !clinica.ativo) {
      throw new NotFoundException('Clinica ativa nao encontrada.');
    }

    const email = dto.email.toLowerCase();
    const existingUser = await this.users.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email ja cadastrado.');
    }

    const twoFactorSetup = this.buildTwoFactorSetup(dto.papel, email);
    const user = await this.users.create({
      nome: dto.nome,
      email,
      passwordHash: await this.hashPassword(dto.password),
      papel: dto.papel,
      clinicaId: adminClinicaId,
      twoFactorSecret: twoFactorSetup?.base32,
      // O COREN informado na criação do ENFERMEIRO é o do perfil (fonte única do carimbo no prontuário).
      ...(dto.papel === Papel.ENFERMEIRO && dto.coren?.trim() ? { coren: dto.coren.trim() } : {}),
      // A senha é gerada e repassada por fora (WhatsApp): TODO papel nasce com troca obrigatória.
      deveTrocarSenha: true,
      // Usuário de clínica em teste beta aceita o Termo de Teste, como o ADMIN dela.
      faseTeste: clinica.faseTeste,
    });

    await this.auditLogs.create({
      event: AuditEvent.USER_CREATED_BY_ADMIN,
      userId: context.user.sub,
      clinicaId: adminClinicaId,
      email: context.user.email,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: {
        clinicaId: adminClinicaId,
        criadorPapel: context.user.papel,
        createdUserId: user.id,
        createdUserEmail: user.email,
        createdUserPapel: user.papel,
        // O COREN costuma nascer vazio (o enfermeiro o preenche depois): null explícito, não chave ausente.
        createdUserCoren: user.coren ?? null,
      },
    });

    return {
      user: toPublicUser(user),
      twoFactorSetup,
    };
  }

  /**
   * Dados do timbre dos documentos clínicos da clínica do PRÓPRIO usuário (feature-timbre-clinico-dinamico).
   * O tenant vem só do token. Só os campos do timbre; ausentes ficam undefined (nunca string vazia).
   */
  /** Nome e fuso da clínica: o servidor formata data/hora dos documentos no fuso dela. */
  async contextoDeEmissao(clinicaId: string): Promise<{ nome: string; fusoHorario: string }> {
    const clinica = await this.clinicas.findById(clinicaId);
    if (!clinica) throw new NotFoundException('Clinica nao encontrada.');
    return { nome: clinica.nome, fusoHorario: clinica.configuracoes.fusoHorario || 'America/Sao_Paulo' };
  }

  /** Declaração e atestado saem com o documento do consultório no cabeçalho: sem ele o servidor não emite. */
  async assertDocumentoInformado(clinicaId: string): Promise<void> {
    const clinica = await this.clinicas.findById(clinicaId);
    if (!clinica) throw new NotFoundException('Clinica nao encontrada.');
    if (!clinica.documento) throw new UnprocessableEntityException('Informe o CPF/CNPJ do consultório');
  }

  /**
   * Primeiro uso: a enfermeira informa o documento do PRÓPRIO consultório, uma única vez. O tenant vem só do token.
   * A trava é o filtro do update (atômico); depois só o super-admin corrige. A auditoria leva só o valor mascarado.
   */
  async preencherDocumento(dto: PreencherDocumentoDto, context: ClinicAdminContext): Promise<MinhaClinica> {
    const clinicaId = context.user.clinicaId;
    if (!clinicaId) throw new ForbiddenException('Usuario sem clinica no token.');

    // Documento que já é de OUTRA clínica: resposta genérica (400), igual à de um número recusado. O cliente nunca
    // descobre que o valor existe em outra clínica; o log leva só o clinicaId, nunca o documento.
    const outra = await this.clinicas.findByDocumento(dto.documento);
    if (outra && outra.id !== clinicaId) {
      this.logger.warn(JSON.stringify({ event: 'clinic_document_collision', clinicaId }));
      throw new BadRequestException(MSG_DOCUMENTO_NAO_SALVO);
    }

    let atualizada: Clinica | null;
    try {
      atualizada = await this.clinicas.preencherDocumentoSeVazio(clinicaId, dto.documento, dto.tipoDocumento);
    } catch (error) {
      // Corrida: o índice único recusou depois da checagem (E11000). Mesma resposta genérica, sem a mensagem do Mongo.
      if ((error as { code?: number })?.code === 11000) {
        this.logger.warn(JSON.stringify({ event: 'clinic_document_collision', clinicaId, origem: 'indice_unico' }));
        throw new BadRequestException(MSG_DOCUMENTO_NAO_SALVO);
      }
      throw error;
    }
    if (!atualizada) {
      throw new ConflictException('O CPF/CNPJ do consultório já foi informado. Para corrigir, fale com o suporte.');
    }

    await this.auditLogs.create({
      event: AuditEvent.CLINIC_FISCAL_DOCUMENT_FILLED,
      userId: context.user.sub,
      email: context.user.email,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: {
        clinicaId,
        tipoDocumento: dto.tipoDocumento,
        documentoMascarado: mascararDocumentoFiscal(dto.tipoDocumento, dto.documento),
      },
    });
    return this.obterMinha(context.user);
  }

  async obterMinha(user: AuthTokenPayload): Promise<MinhaClinica> {
    if (!user.clinicaId) {
      throw new ForbiddenException('Usuario sem clinica no token.');
    }

    const clinica = await this.clinicas.findById(user.clinicaId);
    if (!clinica) {
      throw new NotFoundException('Clinica nao encontrada.');
    }

    const { telefone, emailContato, logoKey } = clinica.configuracoes;
    return {
      nome: clinica.nome,
      documento: clinica.documento,
      tipoDocumento: clinica.tipoDocumento,
      endereco: clinica.endereco,
      telefone: telefone || undefined,
      emailContato: emailContato || undefined,
      logoUrl: await this.logoUrlPresignada(logoKey),
    };
  }

  /** Bucket privado: a logo sai como GET presignado de curta duração; a chave crua nunca vai ao cliente. */
  private async logoUrlPresignada(logoKey?: string): Promise<string | undefined> {
    if (!logoKey) return undefined;
    try {
      return await this.storage.createReadUrl(this.storage.privateUrlForKey(logoKey), LOGO_READ_URL_TTL_SECONDS);
    } catch (error) {
      // Logo é cosmética: sem storage o timbre cai no cabeçalho textual.
      this.logger.warn(`Falha ao presignar a logo da clinica: ${(error as Error).message}`);
      return undefined;
    }
  }

  /**
   * Grava um AuditLog de ação administrativa do super-admin. O SuperAdminService não tem repositório de
   * auditoria próprio; este serviço já grava AuditLog e é injetado nele.
   */
  async registrarAuditoriaAdministrativa(input: CreateAuditLogInput): Promise<void> {
    await this.auditLogs.create(input);
  }

  async findById(id: string): Promise<Clinica | null> {
    return this.clinicas.findById(id);
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.configService.getConfig().bcryptRounds);
  }

  /**
   * Observabilidade (§11 do TDD): o projeto não tem lib de métricas — o
   * mecanismo é o log estruturado (JSON numa linha, só ids/enums, nunca
   * segredos ou dados de paciente).
   */
  private logEventoObservabilidade(
    level: 'error' | 'warn',
    payload: Record<string, unknown>,
  ): void {
    this.logger[level](JSON.stringify({ level, ...payload }));
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
}
