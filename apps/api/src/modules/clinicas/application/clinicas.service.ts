import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
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

export interface ClinicAdminContext extends OnboardingContext {
  user: AuthTokenPayload;
}

@Injectable()
export class ClinicasService {
  constructor(
    @Inject(CLINICA_REPOSITORY) private readonly clinicas: ClinicaRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
    private readonly configService: AppConfigService,
  ) {}

  async onboard(dto: CreateClinicaDto, context: OnboardingContext): Promise<{
    clinica: Clinica;
    admin: { id: string; nome: string; email: string; papel: Papel; clinicaId?: string | null };
    limites: (typeof LIMITES_POR_PLANO)[Clinica['plano']];
    twoFactorSetup?: { required: true; otpauthUrl: string; base32: string };
  }> {
    const existingClinic = await this.clinicas.findByCnpj(dto.cnpj);
    if (existingClinic) {
      throw new ConflictException('CNPJ ja cadastrado.');
    }

    const existingUser = await this.users.findByEmail(dto.primeiroAdmin.email.toLowerCase());
    if (existingUser) {
      throw new ConflictException('Email do primeiro admin ja cadastrado.');
    }

    const clinica = await this.clinicas.create({
      nome: dto.nome,
      cnpj: dto.cnpj,
      endereco: dto.endereco,
      plano: dto.plano,
      configuracoes: dto.configuracoes,
    });

    const adminEmail = dto.primeiroAdmin.email.toLowerCase();
    const twoFactorSetup = this.buildTwoFactorSetup(Papel.ADMIN, adminEmail);
    const admin = await this.users.create({
      nome: dto.primeiroAdmin.nome,
      email: adminEmail,
      passwordHash: await this.hashPassword(dto.primeiroAdmin.password),
      papel: Papel.ADMIN,
      clinicaId: clinica.id,
      twoFactorSecret: twoFactorSetup?.base32,
    });

    await this.auditLogs.create({
      event: AuditEvent.CLINIC_CREATED,
      userId: admin.id,
      email: admin.email,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: {
        clinicaId: clinica.id,
        plano: clinica.plano,
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

    if (![Papel.MEDICO, Papel.ENFERMEIRO, Papel.ADVOGADO, Papel.SECRETARIA].includes(dto.papel)) {
      throw new ForbiddenException('Admin da clinica so pode criar MEDICO, ENFERMEIRO, ADVOGADO ou SECRETARIA.');
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
