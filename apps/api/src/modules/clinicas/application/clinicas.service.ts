import { ConflictException, Inject, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AUDIT_LOG_REPOSITORY, USER_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { UserRepository } from '../../auth/application/ports/user.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { CLINICA_REPOSITORY } from '../clinicas.constants';
import { Clinica, LIMITES_POR_PLANO } from '../domain/clinica.entity';
import { CreateClinicaDto } from './dto/create-clinica.dto';
import { ClinicaRepository } from './ports/clinica.repository';

export interface OnboardingContext {
  ip: string;
  userAgent: string;
}

@Injectable()
export class ClinicasService {
  constructor(
    @Inject(CLINICA_REPOSITORY) private readonly clinicas: ClinicaRepository,
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
  ) {}

  async onboard(dto: CreateClinicaDto, context: OnboardingContext): Promise<{
    clinica: Clinica;
    admin: { id: string; nome: string; email: string; papel: Papel; clinicaId?: string };
    limites: (typeof LIMITES_POR_PLANO)[Clinica['plano']];
  }> {
    const existingClinic = await this.clinicas.findByCnpj(dto.cnpj);
    if (existingClinic) {
      throw new ConflictException('CNPJ ja cadastrado.');
    }

    const existingUser = await this.users.findByEmail(dto.primeiroAdmin.email);
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

    const admin = await this.users.create({
      nome: dto.primeiroAdmin.nome,
      email: dto.primeiroAdmin.email.toLowerCase(),
      passwordHash: await bcrypt.hash(dto.primeiroAdmin.password, 12),
      papel: Papel.ADMIN,
      clinicaId: clinica.id,
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
    };
  }

  async findById(id: string): Promise<Clinica | null> {
    return this.clinicas.findById(id);
  }
}
