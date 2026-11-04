export const TICKET_REPOSITORY = Symbol('TICKET_REPOSITORY');

/** Reserva de atendimento vence sozinha (processo que caiu no meio não trava o ticket para sempre). */
export const TICKET_RESERVA_TTL_MS = 2 * 60 * 1000;
