import { AssinaturaLaudo, LaudoMedico } from '../../domain/laudo-medico.entity';

export interface LaudoMedicoRepository {
  create(data: Omit<LaudoMedico, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<LaudoMedico>;
  findById(clinicaId: string, id: string): Promise<LaudoMedico | null>;
  findByAvaliacaoIU(clinicaId: string, avaliacaoIuId: string): Promise<LaudoMedico | null>;
  listByPaciente(clinicaId: string, pacienteId: string): Promise<LaudoMedico[]>;
  update(clinicaId: string, id: string, data: Partial<LaudoMedico>): Promise<LaudoMedico | null>;
  assinar(clinicaId: string, id: string, assinatura: AssinaturaLaudo): Promise<LaudoMedico | null>;
}
