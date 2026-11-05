import { FollowUp, StatusElegibilidade } from '../../domain/followup.entity';

export interface FollowUpRepository {
  create(data: Omit<FollowUp, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<FollowUp>;
  findById(clinicaId: string, id: string): Promise<FollowUp | null>;
  listByPaciente(clinicaId: string, pacienteId: string): Promise<FollowUp[]>;
  listByAvaliacaoIU(clinicaId: string, avaliacaoIuId: string): Promise<FollowUp[]>;
  countByStatus(clinicaId: string, status: StatusElegibilidade): Promise<number>;
  softDelete(clinicaId: string, id: string, excluidoPor: string): Promise<FollowUp | null>;
}
