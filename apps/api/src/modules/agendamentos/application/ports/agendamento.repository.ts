import { Agendamento, BloqueioAgenda, ModalidadeAtendimento, StatusAgendamento, TipoAgendamento } from '../../domain/agendamento.entity';
import { JanelaLembrete } from '../../domain/lembrete-window';

export interface CreateAgendamentoInput {
  clinicaId: string;
  pacienteId: string;
  medicoId: string;
  modalidade: ModalidadeAtendimento;
  dataHoraInicio: Date;
  dataHoraFim: Date;
  tipo: TipoAgendamento;
  observacoes?: string;
  criadoPor: string;
}

export interface UpdateAgendamentoInput {
  dataHoraInicio?: Date;
  dataHoraFim?: Date;
  tipo?: TipoAgendamento;
  modalidade?: ModalidadeAtendimento;
  observacoes?: string;
  medicoId?: string;
}

export interface ListAgendamentosInput {
  clinicaId: string;
  medicoId?: string;
  pacienteId?: string;
  modalidade?: ModalidadeAtendimento;
  dataInicio?: Date;
  dataFim?: Date;
  status?: StatusAgendamento;
}

export interface CreateBloqueioInput {
  clinicaId: string;
  medicoId: string;
  dataHoraInicio: Date;
  dataHoraFim: Date;
  motivo?: string;
  criadoPor: string;
}

export interface AgendamentoRepository {
  create(input: CreateAgendamentoInput): Promise<Agendamento>;
  findById(clinicaId: string, id: string): Promise<Agendamento | null>;
  list(input: ListAgendamentosInput): Promise<Agendamento[]>;
  update(clinicaId: string, id: string, input: UpdateAgendamentoInput): Promise<Agendamento | null>;
  updateStatus(clinicaId: string, id: string, status: StatusAgendamento, motivoCancelamento?: string): Promise<Agendamento | null>;
  createBloqueio(input: CreateBloqueioInput): Promise<BloqueioAgenda>;
  listBloqueios(clinicaId: string, medicoId?: string, dataInicio?: Date, dataFim?: Date): Promise<BloqueioAgenda[]>;
  deleteBloqueio(clinicaId: string, id: string): Promise<boolean>;
  // feature-consultation-reminder-scheduler: sem clinicaId — job de sistema
  // que varre todas as clínicas, diferente dos métodos acima (sempre por tenant).
  listarParaLembrete(campo: 'lembrete24hEnviadoEm' | 'lembrete1hEnviadoEm', janela: JanelaLembrete): Promise<Agendamento[]>;
  /**
   * Marca o lembrete como enviado — SÓ deve ser chamado depois de
   * NotificacoesService.create() ter tido sucesso, nunca antes (se create()
   * falhar, o campo não pode ser marcado, senão o lembrete nunca mais seria
   * tentado). Update ATÔMICO condicional (`[campo]: {$exists:false}` no
   * filtro): retorna `false` se outra execução concorrente já marcou o
   * mesmo campo entre a query de listarParaLembrete() e esta chamada —
   * esse `false` é o sinal de colisão de idempotência da seção de
   * Monitoring/Rollback do design doc (conta como "deduped", não "sent").
   */
  marcarLembreteEnviado(
    clinicaId: string,
    id: string,
    campo: 'lembrete24hEnviadoEm' | 'lembrete1hEnviadoEm',
    quando: Date,
  ): Promise<boolean>;
}
