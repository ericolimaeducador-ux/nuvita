export interface ProdutoSolicitado {
  codigo: number;
  descricao: string;
  quantidade: number;
  unidade: string;
  codigoSiafisico?: number;
}

export interface AssinaturaLaudo {
  medicoId: string;
  crmNumero?: string;
  dataAssinatura: Date;
  hash: string;
}

export enum StatusLaudoMedico {
  RASCUNHO = 'RASCUNHO',
  AGUARDANDO_REVISAO = 'AGUARDANDO_REVISAO',
  ASSINADO = 'ASSINADO',
}

/** Só relevante quando `prescricaoCateterExterno=true`; tamanho/faixa/código do
 * cateter externo vêm do catálogo via `produtosSolicitados`, não duplicados aqui. */
export interface CateterExternoConfig {
  incluirDescricaoTecnica: boolean;
  incluirCodigoSiafisico: boolean;
}

export type ComparativoAnvisa = 'speedicath' | 'gentlecath';

export interface LaudoMedico {
  id: string;
  clinicaId: string;
  pacienteId: string;
  // Só preenchido no momento da assinatura (ver AssinaturaLaudo.medicoId) —
  // até lá o laudo é um rascunho sem médico responsável definido.
  medicoId?: string;
  criadoPorId: string;
  criadoPorNome?: string;
  criadoPorPapel: string;
  status: StatusLaudoMedico;
  avaliacaoIuId: string;
  dataLaudo: Date;
  cid10: string[];

  // ---- Texto narrativo (Relatório Médico Circunstanciado — CIL) ----
  // Fragmentos preenchíveis por IA a partir do prontuário, que substituíram as
  // antigas listas suspensas do modelo de referência. Ver laudo-medico-ia.service.ts.
  contextoSocial?: string;
  etiologia: string;
  nivelLesao?: string;
  diagnosticoFuncional: string;
  regimeCil: string;
  insumoAtual: string;
  fornecedorAtual?: string;

  // ---- Quadro clínico e riscos (Seção III do modelo — manual, não-IA) ----
  riscoEsvaziamento: boolean;
  riscoItuAtual: boolean;
  riscoAntibioticoterapia: boolean;
  riscoTratoSuperior: boolean;
  riscoInsuficienciaRenal: boolean;
  riscoLesaoUretral: boolean;
  riscoPerdasNoturnas: boolean;

  // ---- Deficiências do insumo atual (Seção IV — manual, não-IA) ----
  deficienciaLubrificacao: boolean;
  deficienciaPontaProtetora: boolean;
  deficienciaMangaProtetora: boolean;
  deficienciaDor: boolean;
  deficienciaAlergiaLidocaina: boolean;
  deficienciaFrascoReutilizado: boolean;
  deficienciaRiscoInternacao: boolean;

  // ---- Prescrição indicada (Seção V — toggles manuais, não-IA) ----
  prescricaoIncluirCodigoFabricante: boolean;
  prescricaoEmbalagemPocket: boolean;
  prescricaoClausulaMarca: boolean;
  prescricaoCateterExterno: boolean;
  prescricaoIncluirObjetivo: boolean;
  prescricaoIncluirConclusao: boolean;
  cateterExterno?: CateterExternoConfig;

  produtosSolicitados: ProdutoSolicitado[];

  // ---- Comparativo técnico ANVISA (Seção VI — seleção manual, não-IA) ----
  comparativoAnvisa?: ComparativoAnvisa;

  // ---- Profissional e fecho (Seção VII) ----
  // Texto livre e editável a qualquer momento até a assinatura — independente
  // da assinatura de auditoria (AssinaturaLaudo), que é o registro legal de
  // quem assinou de fato. Estes campos são só o que aparece impresso no fecho.
  medicoNomeExibicao?: string;
  medicoEspecialidade?: string;
  crmExibicao?: string;
  cidadeEmissao?: string;

  assinado?: AssinaturaLaudo;
  excluidoEm?: Date;
  excluidoPor?: string;
  criadoEm: Date;
  atualizadoEm: Date;
}
