import {
  Cid10,
  Prontuario,
  ProntuarioAddendum,
  TipoAtendimento,
} from '../../domain/prontuario.entity';

export type CreateProntuarioInput = Omit<Prontuario, 'id' | 'assinado' | 'criadoEm' | 'atualizadoEm'>;
export type UpdateProntuarioInput = Partial<
  Omit<Prontuario, 'id' | 'clinicaId' | 'pacienteId' | 'medicoId' | 'assinado' | 'criadoEm' | 'atualizadoEm'>
>;

export interface SignProntuarioInput {
  medicoId: string;
  dataAssinatura: Date;
  hash: string;
}

/** Quantas sessões de um tipo o paciente já tem em prontuário, e quando foram. */
export interface ResumoSessoesPaciente {
  pacienteId: string;
  total: number;
  primeiraEm: Date;
  ultimaEm: Date;
}

export interface ProntuarioRepository {
  create(input: CreateProntuarioInput): Promise<Prontuario>;
  findById(clinicaId: string, prontuarioId: string): Promise<Prontuario | null>;
  listByPaciente(clinicaId: string, pacienteId: string): Promise<Prontuario[]>;
  /** Agrega as sessões por paciente (base da numeração de sessão e do ciclo de cobrança). */
  resumoSessoesPorPaciente(
    clinicaId: string,
    tipo: TipoAtendimento,
    medicoId?: string,
  ): Promise<ResumoSessoesPaciente[]>;
  updateDraft(clinicaId: string, prontuarioId: string, input: UpdateProntuarioInput): Promise<Prontuario | null>;
  sign(clinicaId: string, prontuarioId: string, input: SignProntuarioInput): Promise<Prontuario | null>;
  addAddendum(prontuarioId: string, medicoId: string, texto: string): Promise<ProntuarioAddendum>;
  listAddendums(prontuarioId: string): Promise<ProntuarioAddendum[]>;
}

export interface Cid10Repository {
  autocomplete(query: string, limit?: number): Promise<Cid10[]>;
}
