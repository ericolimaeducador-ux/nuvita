import { AvaliacaoIU } from '../../domain/avaliacao-iu.entity';

export interface AvaliacaoIURepository {
  create(data: Omit<AvaliacaoIU, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<AvaliacaoIU>;
  findById(clinicaId: string, id: string): Promise<AvaliacaoIU | null>;
  listByPaciente(clinicaId: string, pacienteId: string): Promise<AvaliacaoIU[]>;
  listByEnfermeiro(clinicaId: string, enfermeiroId: string): Promise<AvaliacaoIU[]>;
  update(clinicaId: string, id: string, data: Partial<AvaliacaoIU>): Promise<AvaliacaoIU | null>;
  countByClinica(clinicaId: string): Promise<number>;
}
