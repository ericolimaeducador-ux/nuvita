/**
 * Defaults do Relatório Médico Judiciário (formato narrativo CIL), espelhando os
 * atributos `checked` do gerador de referência (gerador_relatorio_pericial_CIL).
 * Compartilhado entre o `create()` do backend e o `reset()` do formulário no
 * frontend para não duplicar esta lista em dois lugares.
 */
export const LAUDO_MEDICO_BOOLEAN_DEFAULTS = {
  riscoEsvaziamento: true,
  riscoItuAtual: false,
  riscoAntibioticoterapia: false,
  riscoTratoSuperior: true,
  riscoInsuficienciaRenal: true,
  riscoLesaoUretral: true,
  riscoPerdasNoturnas: false,
  deficienciaLubrificacao: true,
  deficienciaPontaProtetora: true,
  deficienciaMangaProtetora: true,
  deficienciaDor: false,
  deficienciaAlergiaLidocaina: false,
  deficienciaFrascoReutilizado: false,
  deficienciaRiscoInternacao: false,
  prescricaoIncluirCodigoFabricante: true,
  prescricaoEmbalagemPocket: false,
  prescricaoClausulaMarca: true,
  prescricaoCateterExterno: false,
  prescricaoIncluirObjetivo: true,
  prescricaoIncluirConclusao: true,
} as const;

export const LAUDO_MEDICO_CATETER_EXTERNO_DEFAULTS = {
  incluirDescricaoTecnica: true,
  incluirCodigoSiafisico: true,
} as const;

export const LAUDO_MEDICO_ESPECIALIDADE_DEFAULT = 'Urologia';
