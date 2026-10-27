export enum TipoAtendimento {
  PSICOTERAPIA = 'psicoterapia',
}

export interface Subjetivo {
  queixaPrincipal?: string;
  /** História da Doença Atual. */
  hda?: string;
  /** Antecedentes pessoais / comorbidades / doenças de base. */
  antecedentesPessoais?: string;
  /** Antecedentes cirúrgicos. */
  antecedentesCirurgicos?: string;
  /** Medicamentos em uso contínuo. */
  medicamentosEmUso?: string;
  alergias?: string;
  historiaFamiliar?: string;
  /** Tabagismo, etilismo, atividade física, ocupação, condições de moradia. */
  historiaSocial?: string;
  /** Revisão de sistemas / interrogatório sintomatológico. */
  revisaoSistemas?: string;
}

export interface SinaisVitais {
  pressaoArterial?: string;
  frequenciaCardiaca?: number;
  frequenciaRespiratoria?: number;
  temperatura?: number;
  saturacaoO2?: number;
  peso?: number;
  altura?: number;
  /** Dor de 0 a 10 (escala visual analógica). */
  escalaDor?: number;
}

/** Exame físico segmentado por sistema (todos os campos são opcionais). */
export interface ExameSegmentar {
  cabecaPescoco?: string;
  cardiovascular?: string;
  respiratorio?: string;
  abdome?: string;
  geniturinario?: string;
  neurologico?: string;
  extremidades?: string;
  pele?: string;
}

export interface Objetivo {
  /** Estado geral, nível de consciência, hidratação, etc. */
  estadoGeral?: string;
  sinaisVitais?: SinaisVitais;
  exameSegmentar?: ExameSegmentar;
  /** Achados adicionais / exame físico livre. */
  exameFisico?: string;
}

export interface Avaliacao {
  hipotesesDiagnosticas?: string[];
  cid10?: string[];
  /** Diagnóstico definitivo, quando estabelecido. */
  diagnosticoDefinitivo?: string;
  /** Evolução clínica desde o último atendimento. */
  evolucao?: string;
}

export interface Plano {
  conduta?: string;
  prescricao?: string;
  examesSolicitados?: string[];
  /** Orientações ao paciente/cuidador. */
  orientacoes?: string;
  /** Encaminhamentos a outros profissionais/serviços. */
  encaminhamentos?: string;
  /** Data ou intervalo de retorno sugerido. */
  retorno?: string;
}

/**
 * Registro de atendimento psicológico / sessão de psicoterapia.
 * Estruturado conforme o registro documental da Resolução CFP nº 006/2019
 * (avaliação de demanda, objetivos, evolução, procedimento adotado,
 * encaminhamentos) + anamnese de saúde mental e hábitos de vida.
 */
export interface RegistroPsicologico {
  /** Motivo do atendimento / queixa principal. */
  motivoAtendimento?: string;
  /** Avaliação de demanda (Res. CFP 006/2019). */
  avaliacaoDemanda?: string;
  /** Doenças prévias / condições de saúde relevantes. */
  doencasPrevias?: string;
  /** Diagnósticos de saúde mental (prévios ou atuais). */
  diagnosticosSaudeMental?: string;
  /** Medicamentos em uso (psicotrópicos e demais). */
  medicamentosEmUso?: string;
  /** Histórico familiar de saúde mental. */
  historicoFamiliarSaudeMental?: string;
  // Hábitos de vida
  qualidadeSono?: string;
  apetiteAlimentacao?: string;
  atividadeFisica?: string;
  /** Uso de álcool, tabaco e outras substâncias. */
  usoSubstancias?: string;
  // Estado na sessão
  /** Humor/sentimentos relatados e afeto observado. */
  estadoEmocional?: string;
  /** Dor de 0 a 10 (escala visual analógica). */
  escalaDor?: number;
  /** Avaliação de risco: ideação suicida, autolesão, risco a terceiros. */
  avaliacaoRisco?: string;
  /** Rede de apoio familiar/social. */
  redeApoio?: string;
  // Trabalho realizado
  /** Objetivos do acompanhamento (Res. CFP 006/2019). */
  objetivosTrabalho?: string;
  /** Procedimento técnico-científico adotado na sessão. */
  procedimentoTecnica?: string;
  /** Registro da evolução (Res. CFP 006/2019). */
  evolucao?: string;
  encaminhamentos?: string;
  /** Anotações livres da sessão. */
  anotacoesLivres?: string;
  /** CRP do psicólogo responsável. */
  crp?: string;

  // Campos específicos por linha terapêutica do paciente (TCC, Psicanálise,
  // Humanista, Gestalt, Junguiana) — preenchidos condicionalmente conforme
  // Paciente.linhaTerapeutica, ver apps/web/src/lib/linhaTerapeutica.ts.
  tccPensamentosAutomaticos?: string;
  tccDistorcoesCognitivas?: string;
  tccTarefaCasa?: string;
  tccRegistroComportamental?: string;
  psicanaliseAssociacaoLivre?: string;
  psicanaliseConteudoOnirico?: string;
  psicanaliseDinamicaTransferencial?: string;
  psicanaliseRepeticoes?: string;
  humanistaCongruencia?: string;
  humanistaAutorrealizacao?: string;
  humanistaAcolhimento?: string;
  gestaltAwareness?: string;
  gestaltFiguraFundo?: string;
  gestaltContatoFronteira?: string;
  junguianaSimbolosArquetipicos?: string;
  junguianaMaterialOnirico?: string;
  junguianaProcessoIndividuacao?: string;
}

export interface ArquivoProntuario {
  nome: string;
  url: string;
  tipo: string;
  tamanho: number;
}

export interface AssinaturaProntuario {
  medicoId: string;
  dataAssinatura: Date;
  hash: string;
  /** CRP do perfil do psicólogo, carimbado pelo servidor ao assinar. Ausente nos registros anteriores a essa regra. */
  crp?: string;
}

export interface Prontuario {
  id: string;
  clinicaId: string;
  pacienteId: string;
  medicoId: string;
  agendamentoId?: string;
  dataAtendimento: Date;
  tipo: TipoAtendimento;
  subjetivo: Subjetivo;
  objetivo: Objetivo;
  avaliacao: Avaliacao;
  plano: Plano;
  registroPsicologico?: RegistroPsicologico;
  arquivos: ArquivoProntuario[];
  assinado?: AssinaturaProntuario;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface ProntuarioAddendum {
  id: string;
  prontuarioId: string;
  medicoId: string;
  texto: string;
  criadoEm: Date;
}

export interface Cid10 {
  id: string;
  codigo: string;
  descricao: string;
}
