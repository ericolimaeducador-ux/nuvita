// Checklist administrativo de documentos por paciente. Quando TODOS os itens (não excluídos) do paciente estão
// RECEBIDO, o fluxo clínico avança para AGUARDANDO_CONSULTA_MEDICA (ver ChecklistDocumentosService).
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
  // Exclusão lógica (nada é apagado de verdade): o item some das listagens e da conta de "todos recebidos".
  excluidoEm?: Date;
  excluidoPor?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}
