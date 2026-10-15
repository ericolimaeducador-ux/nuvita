import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { AppConfigService } from '../../../common/security/config.service';
import { AuthTokenPayload, exigeTwoFactor, Papel } from '../../../../../../packages/shared/src/auth';
import { AUDIT_LOG_REPOSITORY, USER_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { UserRepository } from '../../auth/application/ports/user.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { PublicUser, toPublicUser } from '../../auth/domain/user.entity';
import { CLINICA_REPOSITORY } from '../clinicas.constants';
import { Clinica, LIMITES_POR_PLANO } from '../domain/clinica.entity';
import { CreateClinicaUsuarioDto } from './dto/create-clinica-usuario.dto';
import { CreateClinicaDto } from './dto/create-clinica.dto';
import { ClinicaRepository } from './ports/clinica.repository';

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
  ) {}

  async onboard(
    dto: CreateClinicaDto,
    context: OnboardingContext,
    options?: OnboardingOptions,
  ): Promise<{
    clinica: Clinica;
    admin: { id: string; nome: string; email: string; papel: Papel; clinicaId?: string | null };
    limites: (typeof LIMITES_POR_PLANO)[Clinica['plano']];
    twoFactorSetup?: { required: true; otpauthUrl: string; base32: string };
  }> {
    const existingClinic = await this.clinicas.findByDocumento(dto.documento);
    if (existingClinic) {
      throw new ConflictException(`${dto.tipoDocumento} já cadastrado.`);
    }

    const existingUser = await this.users.findByEmail(dto.primeiroAdmin.email.toLowerCase());
    if (existingUser) {
      throw new ConflictException('Email do primeiro admin ja cadastrado.');
    }

    const clinica = await this.clinicas.create({
      nome: dto.nome,
      documento: dto.documento,
      tipoDocumento: dto.tipoDocumento,
      endereco: dto.endereco,
      plano: dto.plano,
      configuracoes: dto.configuracoes,
    });

    const adminEmail = dto.primeiroAdmin.email.toLowerCase();
    const twoFactorSetup = this.buildTwoFactorSetup(Papel.ADMIN, adminEmail);

    let admin;
    try {
      admin = await this.users.create({
        nome: dto.primeiroAdmin.nome,
        email: adminEmail,
        passwordHash: await this.hashPassword(dto.primeiroAdmin.password),
        papel: Papel.ADMIN,
        clinicaId: clinica.id,
        twoFactorSecret: twoFactorSetup?.base32,
        deveTrocarSenha: options?.deveTrocarSenha,
      });
    } catch (error) {
      // Clínica sem admin é lixo — compensa para não deixar órfã. Se a
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

    await this.auditLogs.create({
      event: AuditEvent.CLINIC_CREATED,
      userId: options?.atorUserId ?? admin.id,
      email: admin.email,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: {
        clinicaId: clinica.id,
        plano: clinica.plano,
        ...(options?.atorUserId ? { adminId: admin.id } : {}),
      },
    });

    return {
      clinica,
      admin: {
        id: admin.id,
        nome: admin.nome,
        email: admin.email,
        papel: admin.papel,
        clinicaId: admin.clinicaId,
      },
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

    if (![Papel.PSICOLOGO, Papel.SECRETARIA].includes(dto.papel)) {
      throw new ForbiddenException('Admin da clinica so pode criar PSICOLOGO ou SECRETARIA.');
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
      // Amendment (2026-09-11) em feature-forced-password-change.md: PSICOLOGO
      // também recebe senha gerada e repassada por fora (mesma exposição via
      // WhatsApp que motivou a feature original) — nasce com troca obrigatória.
      // SECRETARIA fica fora do escopo.
      deveTrocarSenha: dto.papel === Papel.PSICOLOGO,
    });

    await this.auditLogs.create({
      event: AuditEvent.USER_CREATED_BY_ADMIN,
      userId: context.user.sub,
      email: context.user.email,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: {
        clinicaId: adminClinicaId,
        createdUserId: user.id,
        createdUserEmail: user.email,
        createdUserPapel: user.papel,
      },
    });

    return {
      user: toPublicUser(user),
      twoFactorSetup,
    };
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
