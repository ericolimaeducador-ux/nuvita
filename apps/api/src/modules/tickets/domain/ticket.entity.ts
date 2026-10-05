export enum TicketStatus {
  ABERTO = 'ABERTO',
  ATENDIDO = 'ATENDIDO',
  RECUSADO = 'RECUSADO',
}

/** Único tipo por enquanto (feature-tickets-superadmin); o campo já comporta outros no futuro. */
export enum TicketTipo {
  CORRECAO_IDENTIDADE = 'CORRECAO_IDENTIDADE',
}

export class Ticket {
  id!: string;
  clinicaId!: string;
  pacienteId!: string;
  tipo!: TicketTipo;
  justificativa!: string;
  autorId!: string;
  status!: TicketStatus;
  abertoEm!: Date;
  resolvidoEm?: Date;
  resolvidoPor?: string;
  motivoRecusa?: string;
}
