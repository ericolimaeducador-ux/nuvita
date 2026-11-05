export enum StatusElegibilidade {
  EM_AVALIACAO = 'em_avaliacao',
  ELEGIVEL = 'elegivel',
  NAO_ELEGIVEL = 'nao_elegivel',
}

export interface FollowUp {
  id: string;
  clinicaId: string;
  pacienteId: string;
  // Referência à avaliação que originou o follow-up. Opcional por ora: o módulo avaliacao-iu ainda não foi portado
  // (os registros antigos têm o valor). TODO: validar a referência quando avaliacao-iu existir.
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
