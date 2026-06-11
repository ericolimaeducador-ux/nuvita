import {
  CanalNotificacao,
  ConteudoNotificacao,
  Notificacao,
  PreferenciaNotificacao,
  StatusNotificacao,
  TipoNotificacao,
} from '../../domain/notificacao.entity';

export interface CreateNotificacaoInput {
  clinicaId: string;
  destinatarioId: string;
  tipo: TipoNotificacao;
  canal: CanalNotificacao;
  conteudo: ConteudoNotificacao;
}

export interface NotificacaoDashboardFilter {
  clinicaId: string;
  status?: StatusNotificacao;
  canal?: CanalNotificacao;
  tipo?: TipoNotificacao;
  inicio?: Date;
  fim?: Date;
}

export interface NotificacaoDashboardResult {
  resumo: Record<StatusNotificacao, number>;
  porCanal: Record<CanalNotificacao, number>;
  recentes: Notificacao[];
}

export interface NotificacaoRepository {
  create(input: CreateNotificacaoInput): Promise<Notificacao>;
  findById(id: string): Promise<Notificacao | null>;
  markQueued(id: string): Promise<void>;
  recordAttempt(id: string, error?: Error | string): Promise<Notificacao | null>;
  markSent(id: string): Promise<Notificacao | null>;
  markFailed(id: string, error: Error | string): Promise<Notificacao | null>;
  dashboard(filter: NotificacaoDashboardFilter): Promise<NotificacaoDashboardResult>;
}

export interface NotificacaoPreferenciaRepository {
  findByPaciente(clinicaId: string, pacienteId: string): Promise<PreferenciaNotificacao | null>;
  upsertOptOut(
    clinicaId: string,
    pacienteId: string,
    canaisOptOut: CanalNotificacao[],
  ): Promise<PreferenciaNotificacao>;
}
