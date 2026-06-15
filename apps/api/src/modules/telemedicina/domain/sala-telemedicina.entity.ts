import { ModalidadeAtendimento } from '../../../../../../packages/shared/src/atendimento';

export { ModalidadeAtendimento };

export enum StatusSala {
  AGUARDANDO = 'aguardando',
  EM_ANDAMENTO = 'em_andamento',
  ENCERRADA = 'encerrada',
  EXPIRADA = 'expirada',
}

export const SALA_TTL_HORAS = 4;

export interface SalaTelemedicina {
  id: string;
  clinicaId: string;
  agendamentoId: string;
  /** Profissional responsavel (medico, enfermeiro ou advogado conforme a modalidade). */
  medicoId: string;
  modalidade: ModalidadeAtendimento;
  pacienteId: string;
  status: StatusSala;
  tokenMedico: string;
  tokenPaciente: string;
  expiresAt: Date;
  iniciadaEm?: Date;
  encerradaEm?: Date;
  criadoEm: Date;
}
