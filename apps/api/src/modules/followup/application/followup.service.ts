import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { EtapaFluxoClinico } from '../../../../../../packages/shared/src/fluxo-clinico';
import { FOLLOWUP_REPOSITORY } from '../followup.constants';
import { FollowUp, StatusElegibilidade } from '../domain/followup.entity';
import { FollowUpRepository } from './ports/followup.repository';
import { CreateFollowUpDto } from './dto/create-followup.dto';
import { NotificacoesService } from '../../notificacoes/application/notificacoes.service';
import { PacientesService } from '../../pacientes/application/pacientes.service';

export interface ResumoFollowUp {
  emAvaliacao: number;
  elegivel: number;
  naoElegivel: number;
}

@Injectable()
export class FollowUpService {
  constructor(
    @Inject(FOLLOWUP_REPOSITORY) private readonly repo: FollowUpRepository,
    @Optional() private readonly notificacoes: NotificacoesService,
    private readonly pacientesService: PacientesService,
  ) {}

  async create(dto: CreateFollowUpDto, user: AuthTokenPayload): Promise<FollowUp> {
    const clinicaId = this.resolveClinicaId(user, dto.clinicaId);
    const followup = await this.repo.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      avaliacaoIuId: dto.avaliacaoIuId,
      enfermeiroId: user.sub,
      dataFollowup: new Date(dto.dataFollowup),
      statusElegibilidade: dto.statusElegibilidade,
      observacoes: dto.observacoes,
      proximoFollowup: dto.proximoFollowup ? new Date(dto.proximoFollowup) : undefined,
    });

    if (dto.statusElegibilidade === StatusElegibilidade.ELEGIVEL) {
      if (this.notificacoes) void this.notificacoes.notificarElegibilidade(clinicaId, dto.pacienteId, 'Paciente');
      await this.pacientesService.avancarEtapaFluxo(
        clinicaId, dto.pacienteId, EtapaFluxoClinico.APTO_AGUARDANDO_CONTATO,
        { ip: 'internal', userAgent: 'pipeline-clinico', user },
      );
    } else if (dto.statusElegibilidade === StatusElegibilidade.NAO_ELEGIVEL) {
      await this.pacientesService.avancarEtapaFluxo(
        clinicaId, dto.pacienteId, EtapaFluxoClinico.NAO_ELEGIVEL,
        { ip: 'internal', userAgent: 'pipeline-clinico', user },
      );
    }

    return followup;
  }

  async resumo(clinicaId: string): Promise<ResumoFollowUp> {
    const [emAvaliacao, elegivel, naoElegivel] = await Promise.all([
      this.repo.countByStatus(clinicaId, StatusElegibilidade.EM_AVALIACAO),
      this.repo.countByStatus(clinicaId, StatusElegibilidade.ELEGIVEL),
      this.repo.countByStatus(clinicaId, StatusElegibilidade.NAO_ELEGIVEL),
    ]);
    return { emAvaliacao, elegivel, naoElegivel };
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
