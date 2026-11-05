/**
 * Lista padrão de documentos que a secretaria/administrativo cobra do
 * paciente (ex.: para instruir pedidos de insumos/judicialização).
 * Fonte única — usada pelo backend para popular o checklist de um paciente
 * de uma vez, em vez de a secretaria digitar cada item manualmente.
 *
 * TODO(conteudo): lista ESPECÍFICA do fluxo de incontinência urinária (SUS, relatório médico, negativa
 * administrativa). Mantida como no Nuvita antigo; revisar na etapa de conteúdo (estomaterapia).
 */
export const DOCUMENTOS_PADRAO: string[] = [
  'RG ou CNH (documento de identificação com foto)',
  'Comprovante de endereço',
  'Comprovante de rendimentos',
  'Cópia da carteirinha do SUS',
  'Relatório médico',
  'Negativa administrativa',
];
