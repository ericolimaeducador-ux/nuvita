import { Ticket, TicketStatus, TicketTipo } from '../../domain/ticket.entity';

export class CriarTicketInput {
  clinicaId!: string;
  pacienteId!: string;
  tipo!: TicketTipo;
  justificativa!: string;
  autorId!: string;
  status!: TicketStatus;
  abertoEm!: Date;
}

export class ListarTicketsInput {
  clinicaId!: string;
  status?: TicketStatus;
  pacienteId?: string;
}

export class ResolverTicketInput {
  status!: TicketStatus.ATENDIDO | TicketStatus.RECUSADO;
  resolvidoPor!: string;
  resolvidoEm!: Date;
  motivoRecusa?: string;
  /** Quando informado, só resolve se a reserva do ticket ainda for deste usuário (atendimento). */
  exigeReservaDe?: string;
}

export interface TicketRepository {
  criar(input: CriarTicketInput): Promise<Ticket>;
  buscarPorId(clinicaId: string, ticketId: string): Promise<Ticket | null>;
  listar(input: ListarTicketsInput): Promise<Ticket[]>;
  /**
   * Posse exclusiva atômica: só reserva se o ticket ainda estiver ABERTO e sem reserva
   * vigente (reserva vencida conta como livre). null = outro SUPER_ADMIN chegou antes.
   */
  reservar(clinicaId: string, ticketId: string, usuarioId: string, agora: Date): Promise<Ticket | null>;
  /** Devolve a reserva (só se ainda for do usuário e o ticket ainda ABERTO). */
  liberar(clinicaId: string, ticketId: string, usuarioId: string): Promise<void>;
  /** Transição atômica ABERTO → ATENDIDO/RECUSADO; null se o ticket já não está ABERTO. */
  resolver(clinicaId: string, ticketId: string, dados: ResolverTicketInput): Promise<Ticket | null>;
}
