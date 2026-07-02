export enum StatusChecklistDocumento {
  PENDENTE = 'pendente',
  RECEBIDO = 'recebido',
}

export interface ChecklistDocumentoItem {
  id: string;
  clinicaId: string;
  pacienteId: string;
  nome: string;
  status: StatusChecklistDocumento;
  observacao?: string;
  criadoPor: string;
  criadoEm: Date;
  atualizadoEm: Date;
}
