export enum LocalAtendimento {
  RESIDENCIA = 'residencia',
  HOSPITAL = 'hospital',
  INST_LONGA_PERMANENCIA = 'inst_longa_permanencia',
}

export enum PerfilCliente {
  ATIVO = 'ativo',
  MODERADO = 'moderado',
  ACAMADO = 'acamado',
  CADEIRANTE = 'cadeirante',
}

export enum Destreza {
  PRESERVADA = 'preservada',
  REDUZIDA = 'reduzida',
  MUITO_REDUZIDA = 'muito_reduzida',
}

export enum TipoIU {
  ESFORCO = 'esforco',
  URGENCIA = 'urgencia',
  MISTA = 'mista',
  RETENCAO_TRANSBORDAMENTO = 'retencao_transbordamento',
  CONTINUA = 'continua',
  INSENSIVEL = 'insensivel',
  ENURESE_NOTURNA = 'enurese_noturna',
  COITO = 'coito',
}

export enum EncaminhamentoIU {
  POLO_SUS = 'polo_sus',
  PLANO_SAUDE = 'plano_saude',
  VAREJO = 'varejo',
}

export interface ProdutoIndicado {
  codigo: number;
  sexo: 'feminino' | 'masculino';
  french: number;
}

export interface AvaliacaoIU {
  id: string;
  clinicaId: string;
  pacienteId: string;
  enfermeiroId: string;
  /** Nome do profissional que preencheu — para a assinatura da ficha impressa. */
  enfermeiroNome?: string;
  agendamentoId?: string;
  dataAtendimento: Date;
  local: LocalAtendimento;
  prescritor?: string;
  planoSaude?: string;
  hospitalReferencia?: string;
  motivoIU: string;
  inicioSintomas?: string;
  perfilCliente: PerfilCliente;
  destreza: Destreza;
  dntui: boolean;
  tiposIU: TipoIU[];
  miccaoEspontanea: boolean;
  volumeAproximadoMl?: number;
  realizaCateterismo: boolean;
  cateterismosDia?: number;
  cateterUtilizado?: string;
  ultimaInfeccaoUrinaria?: string;
  emTratamento: boolean;
  tratamento?: string;
  volumeDrenadoMl?: string;
  outrasIntercorrencias?: string;
  produtoIndicado?: ProdutoIndicado;
  responsavelCateterismo?: string;
  autorizaPesquisa: boolean;
  aceitaInformacoes: boolean;
  emailContato?: string;
  whatsappContato?: string;
  coren?: string;
  encaminhamento?: EncaminhamentoIU;
  localEncaminhamento?: string;
  respCuidador?: string;
  excluidoEm?: Date;
  excluidoPor?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}
