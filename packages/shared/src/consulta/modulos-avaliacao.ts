import { ClassificacaoArea } from '../paciente/classificacao';
import { ModuloIncontinenciaAnal, validarModuloIncontinenciaAnal } from './modulo-incontinencia-anal';
import { ModuloIU, validarModuloIU } from './modulo-iu';

/** Áreas do slot `avaliacao.modulos` da consulta de enfermagem (união discriminada por `area`). */
export enum AreaModuloAvaliacao {
  IU = 'IU',
  INCONTINENCIA_ANAL = 'INCONTINENCIA_ANAL',
  FERIDA = 'FERIDA',
  OSTOMIA = 'OSTOMIA',
}

export type ModuloAvaliacaoTipado =
  | { area: AreaModuloAvaliacao.IU; dados: ModuloIU }
  | { area: AreaModuloAvaliacao.INCONTINENCIA_ANAL; dados: ModuloIncontinenciaAnal };

/**
 * Classificação do paciente que libera cada módulo (decisão do Erico, 05/11/2026): IU = incontinência urinária E anal;
 * FA = feridas; OT = ostomias. FERIDA e OSTOMIA já mapeados para a 5c/5d, mas sem módulo registrado ainda.
 */
export const CLASSIFICACAO_DO_MODULO: Record<AreaModuloAvaliacao, ClassificacaoArea> = {
  [AreaModuloAvaliacao.IU]: ClassificacaoArea.IU,
  [AreaModuloAvaliacao.INCONTINENCIA_ANAL]: ClassificacaoArea.IU,
  [AreaModuloAvaliacao.FERIDA]: ClassificacaoArea.FA,
  [AreaModuloAvaliacao.OSTOMIA]: ClassificacaoArea.OT,
};

/** Módulos com conteúdo implementado (os outros são recusados). */
export const VALIDADORES_MODULO: Partial<Record<AreaModuloAvaliacao, (dados: unknown) => string[]>> = {
  [AreaModuloAvaliacao.IU]: validarModuloIU,
  [AreaModuloAvaliacao.INCONTINENCIA_ANAL]: validarModuloIncontinenciaAnal,
};

/** A classificação do paciente libera a área? (Só o mapeamento; se o módulo tem conteúdo é outra pergunta.) */
export function classificacaoLiberaModulo(area: AreaModuloAvaliacao, classificacoes: readonly ClassificacaoArea[] | null | undefined): boolean {
  return !!classificacoes && classificacoes.includes(CLASSIFICACAO_DO_MODULO[area]);
}

/** Liberado pela classificação E com conteúdo implementado (o que a tela oferece em "Adicionar módulo"). */
export function moduloDisponivelPara(area: AreaModuloAvaliacao, classificacoes: readonly ClassificacaoArea[] | null | undefined): boolean {
  return classificacaoLiberaModulo(area, classificacoes) && !!VALIDADORES_MODULO[area];
}

export function modulosDisponiveis(classificacoes: readonly ClassificacaoArea[] | null | undefined): AreaModuloAvaliacao[] {
  return Object.values(AreaModuloAvaliacao).filter((a) => moduloDisponivelPara(a, classificacoes));
}

/** Ids de anexos referenciados pelos diários do módulo (para validar que são da própria consulta). */
export function anexosReferenciados(modulo: { area: AreaModuloAvaliacao; dados: unknown }): string[] {
  const d = modulo.dados as { diarioMiccional?: { anexos?: string[] }; diarioIntestinal?: { anexos?: string[] } } | undefined;
  if (modulo.area === AreaModuloAvaliacao.IU) return d?.diarioMiccional?.anexos ?? [];
  if (modulo.area === AreaModuloAvaliacao.INCONTINENCIA_ANAL) return d?.diarioIntestinal?.anexos ?? [];
  return [];
}
