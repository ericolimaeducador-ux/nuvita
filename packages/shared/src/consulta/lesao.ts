/**
 * Cadastro de LESÕES do paciente (etapa 5c). Uma lesão existe fora da consulta (coleção `lesoes`); cada consulta assinada
 * avalia lesões abertas no módulo FERIDA, e o desfecho da avaliação muda o status da lesão na assinatura.
 *
 * As etiologias são [PROTOCOLO DO SERVIÇO]: lista do serviço, NÃO padrão de norma.
 * TODO(conteudo): rótulos de etiologia, subtipo de lesão por umidade e lado para revisão.
 */
import { Erros, objeto, opcao, texto } from './validacao';

export const ROTULO_PROTOCOLO_SERVICO = 'protocolo do serviço';

export const LADOS_LESAO = ['DIREITO', 'ESQUERDO', 'CENTRAL', 'NAO_SE_APLICA'] as const;
export type LadoLesao = (typeof LADOS_LESAO)[number];

/** [PROTOCOLO DO SERVIÇO] */
export const ETIOLOGIAS_LESAO = [
  'LESAO_POR_PRESSAO',
  'ULCERA_VENOSA',
  'ULCERA_ARTERIAL',
  'ULCERA_MISTA',
  'PE_DIABETICO',
  'LESAO_UMIDADE',
  'LESAO_ADESIVO_MEDICO',
  'LACERACAO_CUTANEA',
  'FERIDA_CIRURGICA',
  'TRAUMATICA',
  'OUTRA',
] as const;
export type EtiologiaLesao = (typeof ETIOLOGIAS_LESAO)[number];

/** [PROTOCOLO DO SERVIÇO] Subtipo OBRIGATÓRIO quando a etiologia é LESAO_UMIDADE. */
export const SUBTIPOS_LESAO_UMIDADE = [
  'DERMATITE_ASSOCIADA_INCONTINENCIA',
  'PERIESTOMAL',
  'PERIFERIDA',
  'INTERTRIGINOSA',
] as const;
export type SubtipoLesaoUmidade = (typeof SUBTIPOS_LESAO_UMIDADE)[number];

export const STATUS_LESAO = ['ABERTA', 'CICATRIZADA', 'ENCERRADA'] as const;
export type StatusLesao = (typeof STATUS_LESAO)[number];

/** Dados clínicos que identificam a lesão (os que podem ser CORRIGIDOS com histórico). */
export interface IdentificacaoLesao {
  localizacaoAnatomica: string;
  lado: LadoLesao;
  etiologia: EtiologiaLesao;
  /** Obrigatório se etiologia = LESAO_UMIDADE; proibido nas demais. */
  subtipoUmidade?: SubtipoLesaoUmidade;
  /** Obrigatório se etiologia = OUTRA; proibido nas demais. */
  etiologiaOutra?: string;
}

export const LOCALIZACAO_MAX = 300;

/** Valida a identificação (cadastro ou correção). Erros só com NOMES de campo. */
export function validarIdentificacaoLesao(v: unknown): string[] {
  const e = new Erros();
  const o = objeto(v, 'lesao', ['localizacaoAnatomica', 'lado', 'etiologia', 'subtipoUmidade', 'etiologiaOutra'], e);
  if (!o) return e.lista;
  const loc = texto(o.localizacaoAnatomica, 'localizacaoAnatomica', e, true);
  if (loc !== undefined && loc.trim() === '') e.add('localizacaoAnatomica', 'obrigatorio');
  if (loc !== undefined && loc.length > LOCALIZACAO_MAX) e.add('localizacaoAnatomica', 'texto longo demais');
  opcao(o.lado, 'lado', LADOS_LESAO, e, true);
  const etiologia = opcao(o.etiologia, 'etiologia', ETIOLOGIAS_LESAO, e, true);

  const subtipo = opcao(o.subtipoUmidade, 'subtipoUmidade', SUBTIPOS_LESAO_UMIDADE, e, etiologia === 'LESAO_UMIDADE');
  if (subtipo !== undefined && etiologia !== 'LESAO_UMIDADE') e.add('subtipoUmidade', 'so se aplica a lesao por umidade');

  const outra = texto(o.etiologiaOutra, 'etiologiaOutra', e, etiologia === 'OUTRA');
  if (etiologia === 'OUTRA' && outra !== undefined && outra.trim() === '') e.add('etiologiaOutra', 'obrigatorio');
  if (outra !== undefined && etiologia !== undefined && etiologia !== 'OUTRA') e.add('etiologiaOutra', 'so se aplica a etiologia OUTRA');
  if (outra !== undefined && outra.length > LOCALIZACAO_MAX) e.add('etiologiaOutra', 'texto longo demais');
  return e.lista;
}
