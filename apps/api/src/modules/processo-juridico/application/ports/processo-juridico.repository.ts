import { DocumentoProcesso, ProcessoJuridico, StatusProcesso } from '../../domain/processo-juridico.entity';

export interface ProcessoJuridicoRepository {
  create(data: Omit<ProcessoJuridico, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<ProcessoJuridico>;
  findById(clinicaId: string, id: string): Promise<ProcessoJuridico | null>;
  findByPaciente(clinicaId: string, pacienteId: string): Promise<ProcessoJuridico[]>;
  listByAdvogado(clinicaId: string, advogadoId: string): Promise<ProcessoJuridico[]>;
  updateStatus(clinicaId: string, id: string, status: StatusProcesso, observacoes?: string): Promise<ProcessoJuridico | null>;
  addDocumento(clinicaId: string, id: string, documento: DocumentoProcesso): Promise<ProcessoJuridico | null>;
  update(clinicaId: string, id: string, data: Partial<ProcessoJuridico>): Promise<ProcessoJuridico | null>;
}
