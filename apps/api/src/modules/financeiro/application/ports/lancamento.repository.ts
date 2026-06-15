import { DashboardFinanceiro, FormaPagamento, Lancamento, StatusLancamento, TipoLancamento } from '../../domain/lancamento.entity';

export interface CreateLancamentoInput {
  clinicaId: string;
  pacienteId?: string;
  agendamentoId?: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  formaPagamento?: FormaPagamento;
  vencimento?: Date;
  observacoes?: string;
  criadoPor: string;
}

export interface ListLancamentosInput {
  clinicaId: string;
  pacienteId?: string;
  agendamentoId?: string;
  tipo?: TipoLancamento;
  status?: StatusLancamento;
  dataInicio?: Date;
  dataFim?: Date;
}

export interface DashboardInput {
  clinicaId: string;
  dataInicio: Date;
  dataFim: Date;
}

export interface LancamentoRepository {
  create(input: CreateLancamentoInput): Promise<Lancamento>;
  findById(clinicaId: string, id: string): Promise<Lancamento | null>;
  list(input: ListLancamentosInput): Promise<Lancamento[]>;
  updateStatus(clinicaId: string, id: string, status: StatusLancamento, recebidoEm?: Date): Promise<Lancamento | null>;
  dashboard(input: DashboardInput): Promise<DashboardFinanceiro>;
}
