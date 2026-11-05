export enum StatusElegibilidade {
  EM_AVALIACAO = 'em_avaliacao',
  ELEGIVEL = 'elegivel',
  NAO_ELEGIVEL = 'nao_elegivel',
}

export interface FollowUp {
  id: string;
  clinicaId: string;
  pacienteId: string;
  // Referência à avaliação que originou o follow-up (validada na criação: existe e é deste paciente/clínica).
  // Opcional: registros sem avaliação continuam válidos.
  avaliacaoIuId?: string;
  enfermeiroId: string;
  dataFollowup: Date;
  statusElegibilidade: StatusElegibilidade;
  observacoes: string;
  proximoFollowup?: Date;
  excluidoEm?: Date;
  excluidoPor?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}
