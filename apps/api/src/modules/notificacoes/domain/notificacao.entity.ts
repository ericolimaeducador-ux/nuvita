export enum CanalNotificacao {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  SMS = 'sms',
}

export enum StatusNotificacao {
  PENDENTE = 'pendente',
  ENVIADO = 'enviado',
  FALHOU = 'falhou',
}

export enum TipoNotificacao {
  LEMBRETE_CONSULTA_24H = 'lembrete_consulta_24h',
  LEMBRETE_CONSULTA_1H = 'lembrete_consulta_1h',
  CONFIRMACAO_AGENDAMENTO = 'confirmacao_agendamento',
  LINK_TELECONSULTA = 'link_teleconsulta',
  RESULTADO_DISPONIVEL = 'resultado_disponivel',
}

export interface ConteudoNotificacao {
  assunto?: string;
  mensagem: string;
  destino: string;
  variaveis?: Record<string, string>;
}

export interface ErroNotificacao {
  mensagem: string;
  data: Date;
  detalhe?: string;
}

export interface Notificacao {
  id: string;
  clinicaId: string;
  destinatarioId: string;
  tipo: TipoNotificacao;
  canal: CanalNotificacao;
  status: StatusNotificacao;
  conteudo: ConteudoNotificacao;
  tentativas: number;
  erros: ErroNotificacao[];
  criadoEm: Date;
  enviadoEm?: Date;
}

export interface PreferenciaNotificacao {
  id: string;
  clinicaId: string;
  pacienteId: string;
  canaisOptOut: CanalNotificacao[];
  atualizadoEm: Date;
}
