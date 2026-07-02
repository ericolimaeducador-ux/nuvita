export enum TipoAtendimento {
  CONSULTA = 'consulta',
  RETORNO = 'retorno',
  URGENCIA = 'urgencia',
  TELECONSULTA = 'teleconsulta',
  CONSULTA_ENFERMAGEM = 'consulta_enfermagem',
}

export interface Subjetivo {
  // Opcional pois a consulta de enfermagem (CONSULTA_ENFERMAGEM) não é um SOAP
  // tradicional e não preenche este bloco.
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

export enum NaturezaAtendimento {
  SUS = 'sus',
  SUPLEMENTAR = 'suplementar',
  PARTICULAR = 'particular',
}

export enum TipoSolicitacaoJudicial {
  MEDICAMENTO = 'medicamento',
  PRODUTO = 'produto',
  PROCEDIMENTO = 'procedimento',
}

export interface PrescritorJudicial {
  nome?: string;
  /** Conselho + número: ex. "CRM-SP 123456" ou "COREN-SP 123456". */
  registro?: string;
  especialidade?: string;
}

export interface ProdutoJudicial {
  descricao?: string;
  /** Calibre em French (Fr), quando cateter. */
  calibreFrench?: number;
  /** Comprimento em cm. */
  comprimentoCm?: number;
  quantidadePorDia?: number;
  quantidadePorMes?: number;
  usoContinuo?: boolean;
}

export interface MedicamentoJudicial {
  /** Princípio ativo — DCB (ou DCI na ausência da DCB). */
  principioAtivo?: string;
  formaFarmaceuticaApresentacao?: string;
  dose?: string;
  posologia?: string;
  viaAdministracao?: string;
  duracaoTratamento?: string;
}

/**
 * Bloco de judicialização (NAT-JUS/SP). Preenchido quando o atendimento gera
 * uma demanda judicial de insumo/medicamento/procedimento. Espelha o Anexo IV
 * (Formulário de Solicitação de Informação Técnica ao NAT-JUS) e os requisitos
 * de relatório e receituário médico (validade de 90 dias).
 */
export interface RelatorioJudicial {
  municipioEstado?: string;
  naturezaAtendimento?: NaturezaAtendimento;
  /** Enfermidade + CID principal e causa de base. */
  enfermidadeCid?: string;
  /** História/evolução da doença. */
  historicoDoenca?: string;
  /** Tratamentos já realizados e respectivos resultados. */
  tratamentosRealizados?: string;
  tipoSolicitacao?: TipoSolicitacaoJudicial;
  produto?: ProdutoJudicial;
  medicamento?: MedicamentoJudicial;
  procedimentoDescricao?: string;
  urgente?: boolean;
  justificativaUrgencia?: string;
  imprescindivel?: boolean;
  justificativaImprescindivel?: string;
  beneficiosEsperados?: string;
  consequenciasNaoUso?: string;
  prescritor?: PrescritorJudicial;
  /** Data de emissão do relatório (base para a validade de 90 dias). */
  dataEmissao?: Date;
}

export interface CateterIndicado {
  sexo?: string;
  french?: number;
  codigo?: number;
}

/** Questionário de Avaliação de Incontinência Urinária embutido no prontuário. */
export interface FichaAvaliacaoIU {
  local?: string;
  estadoCivil?: string;
  prescritor?: string;
  planoSaude?: string;
  hospitalReferencia?: string;
  motivoIU?: string;
  inicioSintomas?: string;
  perfilCliente?: string;
  destreza?: string;
  dntui?: boolean;
  tiposIU?: string[];
  miccaoEspontanea?: boolean;
  volumeAproximadoMl?: number;
  realizaCateterismo?: boolean;
  cateterismosDia?: number;
  cateterUtilizado?: string;
  ultimaInfeccaoUrinaria?: string;
  emTratamento?: boolean;
  tratamento?: string;
  volumeDrenado?: string;
  outrasIntercorrencias?: string;
  cateterIndicado?: CateterIndicado;
  encaminhamento?: string;
  localEncaminhamento?: string;
  responsavelCateterismo?: string;
  autorizaPesquisa?: boolean;
  aceitaInformacoes?: boolean;
  emailContato?: string;
  whatsappContato?: string;
  coren?: string;
  respCuidador?: string;
}

/** Registro da consulta de enfermagem (ligação de acompanhamento + chegada da sonda de teste). */
export interface RegistroEnfermagem {
  dataLigacao?: Date;
  sondaChegouEm?: Date;
  observacoes?: string;
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
  fichaAvaliacaoIU?: FichaAvaliacaoIU;
  registroEnfermagem?: RegistroEnfermagem;
  relatorioJudicial?: RelatorioJudicial;
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
