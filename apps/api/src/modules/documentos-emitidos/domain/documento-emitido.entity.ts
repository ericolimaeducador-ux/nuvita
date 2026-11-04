export enum TipoDocumentoEmitido {
  DECLARACAO_COMPARECIMENTO = 'DECLARACAO_COMPARECIMENTO',
  ATESTADO_COMPARECIMENTO = 'ATESTADO_COMPARECIMENTO',
}

/** Registro de cada documento emitido pelo servidor: qual, para quem, por quem e quando. */
export interface DocumentoEmitido {
  id: string;
  clinicaId: string;
  pacienteId: string;
  agendamentoId: string;
  tipo: TipoDocumentoEmitido;
  emitidoPor: string;
  emitidoEm: Date;
  /** Número exibido no documento, para conferência. */
  protocolo: string;
}

/** O que a tela renderiza: o texto final e os dados de assinatura vêm prontos do servidor. */
export interface DocumentoEmitidoView {
  id: string;
  protocolo: string;
  tipo: TipoDocumentoEmitido;
  titulo: string;
  corpo: string;
  atendimento: { data: string; horaInicio: string; horaFim: string };
  emissor: { nome: string; crp?: string };
  clinica: { nome: string };
  emitidoEm: string;
}
