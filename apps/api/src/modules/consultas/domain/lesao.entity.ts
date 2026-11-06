// LESÕES do paciente (etapa 5c) e CONSENTIMENTO de imagem. Nada é apagado fisicamente: a lesão muda de status só pela
// assinatura de uma consulta (desfecho da avaliação, com consultaId gravado); correções de identificação são versionadas
// (histórico com autor, data, motivo e valores anteriores); o consentimento é revogado, nunca removido.
import {
  IdentificacaoLesao,
  StatusLesao,
} from '../../../../../../packages/shared/src/consulta';

export type { IdentificacaoLesao, StatusLesao };

export interface CorrecaoLesao {
  em: Date;
  por: string;
  motivo: string;
  /** Valores ANTES da correção (o atual fica na própria lesão). */
  anterior: IdentificacaoLesao;
}

export interface Lesao extends IdentificacaoLesao {
  id: string;
  clinicaId: string;
  pacienteId: string;
  /** Sequencial por paciente: 1, 2, 3… (índice único pacienteId+numero, retry em E11000). */
  numero: number;
  /** AAAA-MM-DD. */
  dataIdentificacao: string;
  status: StatusLesao;
  /** Só em ENCERRADA (vem do desfecho da avaliação). */
  motivoEncerramento?: string;
  /** Consulta ASSINADA cujo desfecho mudou o status. */
  statusConsultaId?: string;
  statusAlteradoEm?: Date;
  statusAlteradoPor?: string;
  correcoes: CorrecaoLesao[];
  /** Controle otimista das correções. */
  versao: number;
  criadaPor: string;
  criadaEm: Date;
  atualizadaEm: Date;
}

export interface ConsentimentoImagem {
  id: string;
  clinicaId: string;
  pacienteId: string;
  obtidoEm: Date;
  registradoPor: string;
  revogadoEm: Date | null;
  revogadoPor: string | null;
  criadoEm: Date;
}
