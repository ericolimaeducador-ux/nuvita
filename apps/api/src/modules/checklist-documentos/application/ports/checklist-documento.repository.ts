import { ChecklistDocumentoItem, StatusChecklistDocumento } from '../../domain/checklist-documento.entity';

export interface UpdateChecklistDocumentoInput {
  nome?: string;
  status?: StatusChecklistDocumento;
  observacao?: string;
}

export interface ChecklistDocumentoRepository {
  create(data: Omit<ChecklistDocumentoItem, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<ChecklistDocumentoItem>;
  listByPaciente(clinicaId: string, pacienteId: string): Promise<ChecklistDocumentoItem[]>;
  update(clinicaId: string, id: string, input: UpdateChecklistDocumentoInput): Promise<ChecklistDocumentoItem | null>;
  delete(clinicaId: string, id: string): Promise<boolean>;
  countPendentesPorClinica(clinicaId: string): Promise<number>;
}
