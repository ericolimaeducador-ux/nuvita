import { CursorPaginationInput, CursorPaginationResult } from '../../domain/pagination';
import {
  ClassificacaoArea,
  EtapaFluxoClinico,
  LinhaTerapeutica,
  Paciente,
  ProjetoPaciente,
} from '../../domain/paciente.entity';

/** Cadastro exige ao menos uma classificação de área. */
export type CreatePacienteInput = Omit<Paciente, 'id' | 'ativo' | 'criadoEm' | 'atualizadoEm' | 'classificacoes'> & {
  classificacoes: ClassificacaoArea[];
};

export type UpdatePacienteInput = Partial<
  Omit<Paciente, 'id' | 'clinicaId' | 'ativo' | 'criadoEm' | 'atualizadoEm'>
>;

/**
 * Correção de identidade (feature-correcao-identidade-paciente). O repositório
 * grava os novos valores E preserva o estado anterior na MESMA operação atômica —
 * nunca há correção aplicada sem a versão anterior guardada.
 */
export interface CorrigirIdentidadeInput {
  nome?: string;
  cpf?: string;
  dataNascimento?: Date;
  justificativa: string;
  /** Quem pediu a correção (id de usuário); o próprio executor quando não há outro solicitante. */
  solicitadoPor: string;
  ticketId?: string;
  /** Sempre o SUPER_ADMIN autenticado. */
  executadoPor: string;
  /** Gerado no servidor. */
  executadoEm: Date;
}

export const PACIENTE_SORTS = [
  'recentes',
  'nome_asc',
  'nome_desc',
  'nascimento_asc',
  'nascimento_desc',
] as const;

export type PacienteSort = (typeof PACIENTE_SORTS)[number];

export interface ListPacientesInput extends CursorPaginationInput {
  clinicaId: string;
  incluirInativos?: boolean;
  projeto?: ProjetoPaciente;
  linhaTerapeutica?: LinhaTerapeutica;
  representante?: string;
  /** Só pacientes cuja etapa do fluxo clínico é esta. */
  etapaFluxo?: EtapaFluxoClinico;
  /** true = só pacientes ELEGÍVEIS ao fluxo clínico (classificacoes exatamente [IU]). */
  somenteFluxoClinico?: boolean;
  /** Dia exato de nascimento no formato YYYY-MM-DD. */
  dataNascimento?: string;
  sort?: PacienteSort;
}

export interface SearchPacientesByNameInput extends ListPacientesInput {
  nome: string;
}

export interface PacienteRepository {
  create(input: CreatePacienteInput): Promise<Paciente>;
  list(input: ListPacientesInput): Promise<CursorPaginationResult<Paciente>>;
  searchByName(input: SearchPacientesByNameInput): Promise<CursorPaginationResult<Paciente>>;
  findByCpf(clinicaId: string, cpf: string, incluirInativos?: boolean): Promise<Paciente | null>;
  findById(clinicaId: string, pacienteId: string, incluirInativos?: boolean): Promise<Paciente | null>;
  /** Busca vários pacientes por id (inclui inativos) — usado p/ resolver nome/CPF em lote. */
  findManyByIds(clinicaId: string, pacienteIds: string[]): Promise<Paciente[]>;
  update(clinicaId: string, pacienteId: string, input: UpdatePacienteInput): Promise<Paciente | null>;
  /** Aplica a correção e preserva a versão anterior atomicamente; null se o paciente ativo não existe no tenant. */
  corrigirIdentidade(clinicaId: string, pacienteId: string, input: CorrigirIdentidadeInput): Promise<Paciente | null>;
  deactivate(clinicaId: string, pacienteId: string): Promise<Paciente | null>;
  /** Valores distintos de `representante` já usados na clínica, para autocomplete. */
  listarRepresentantesDistintos(clinicaId: string): Promise<string[]>;
}
