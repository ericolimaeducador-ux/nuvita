import { UnprocessableEntityException } from '@nestjs/common';

// Não se registra, conclui nem se atesta atendimento que ainda não aconteceu (feature-attendance-not-in-the-future).
export function assertAtendimentoComecou(dataHoraInicio: Date, agora: Date = new Date()): void {
  if (dataHoraInicio.getTime() > agora.getTime()) {
    throw new UnprocessableEntityException('O atendimento ainda não começou.');
  }
}

/** A declaração afirma o intervalo inteiro: só depois do fim. */
export function assertAtendimentoTerminou(dataHoraFim: Date, agora: Date = new Date()): void {
  if (dataHoraFim.getTime() > agora.getTime()) {
    throw new UnprocessableEntityException('O atendimento ainda não terminou.');
  }
}
