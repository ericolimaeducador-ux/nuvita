import { ChecklistDocumentoItem, StatusChecklistDocumento } from '../../domain/checklist-documento.entity';

export interface UpdateChecklistDocumentoInput {
  nome?: string;
  status?: StatusChecklistDocumento;
  observacao?: string;
}

export interface ChecklistDocumentoRepository {
  create(data: Omit<ChecklistDocumentoItem, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<ChecklistDocumentoItem>;
  /** Só itens não excluídos. */
  listByPaciente(clinicaId: string, pacienteId: string): Promise<ChecklistDocumentoItem[]>;
  update(clinicaId: string, id: string, input: UpdateChecklistDocumentoInput): Promise<ChecklistDocumentoItem | null>;
  /** Exclusão lógica. Devolve o item excluído, ou null se não existe (ou já foi excluído). */
  softDelete(clinicaId: string, id: string, excluidoPor: string): Promise<ChecklistDocumentoItem | null>;
  countPendentesPorClinica(clinicaId: string): Promise<number>;
}
