import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { FOLLOWUP_REPOSITORY } from '../followup.constants';
import { FollowUp } from '../domain/followup.entity';
import { FollowUpRepository } from './ports/followup.repository';
import { CreateFollowUpDto } from './dto/create-followup.dto';

@Injectable()
export class FollowUpService {
  constructor(@Inject(FOLLOWUP_REPOSITORY) private readonly repo: FollowUpRepository) {}

  async create(dto: CreateFollowUpDto, user: AuthTokenPayload): Promise<FollowUp> {
    const clinicaId = this.resolveClinicaId(user, dto.clinicaId);
    return this.repo.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      avaliacaoIuId: dto.avaliacaoIuId,
      enfermeiroId: user.sub,
      dataFollowup: new Date(dto.dataFollowup),
      statusElegibilidade: dto.statusElegibilidade,
      observacoes: dto.observacoes,
      proximoFollowup: dto.proximoFollowup ? new Date(dto.proximoFollowup) : undefined,
    });
  }

  async listByPaciente(pacienteId: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<FollowUp[]> {
    if (!pacienteId) throw new BadRequestException('pacienteId é obrigatório.');
    return this.repo.listByPaciente(this.resolveClinicaId(user, clinicaId), pacienteId);
  }

  async listByAvaliacao(avaliacaoIuId: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<FollowUp[]> {
    return this.repo.listByAvaliacaoIU(this.resolveClinicaId(user, clinicaId), avaliacaoIuId);
  }

  async findOne(id: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<FollowUp> {
    const f = await this.repo.findById(this.resolveClinicaId(user, clinicaId), id);
    if (!f) throw new NotFoundException('Follow-up não encontrado.');
    return f;
  }

  private resolveClinicaId(user: AuthTokenPayload, requested?: string): string {
    if (user.clinicaId) return user.clinicaId;
    if (requested) return requested;
    throw new BadRequestException('clinicaId é obrigatório.');
  }
}
