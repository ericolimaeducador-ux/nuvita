import { PapelSala } from './sala-evento.entity';

export enum TipoSinal {
  /** Paciente anuncia presença; o profissional responde com uma (re)oferta. */
  PRONTO = 'pronto',
  OFFER = 'offer',
  ANSWER = 'answer',
  CANDIDATE = 'candidate',
  BYE = 'bye',
}

/**
 * Mensagem de sinalização WebRTC (SDP/ICE) trocada entre os dois participantes.
 * A mídia NÃO passa por aqui — só a negociação da conexão ponto-a-ponto.
 * Transporte por HTTP polling: o Firebase Hosting na frente do Cloud Run não
 * suporta upgrade de WebSocket, e o volume de sinalização é mínimo.
 */
export interface SinalSala {
  id: string;
  salaId: string;
  de: PapelSala;
  tipo: TipoSinal;
  payload: unknown;
  criadoEm: Date;
}
