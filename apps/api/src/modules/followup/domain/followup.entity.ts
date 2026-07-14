export enum StatusElegibilidade {
  EM_AVALIACAO = 'em_avaliacao',
  ELEGIVEL = 'elegivel',
  NAO_ELEGIVEL = 'nao_elegivel',
}

export interface FollowUp {
  id: string;
  clinicaId: string;
  pacienteId: string;
  avaliacaoIuId: string;
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
