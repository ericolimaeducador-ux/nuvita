/**
 * Módulo de avaliação de INCONTINÊNCIA ANAL (etapa 5b). Conteúdo restrito ao especificado a partir do Compêndio Científico
 * de Estomaterapia. SEM escala de Bristol (nome, desenho ou descrição dos tipos — obra protegida) e sem instrumentos com
 * itens (Wexner, FIQL etc. ficam para a 5e). Nenhuma conduta automática nem gravidade calculada.
 * TODO(conteudo): rótulos de tipo de perda, subtipo, consistência e sinais de alarme para revisão.
 */
import { Diario, validarDiario } from './diario';
import { ItemExame } from './modulo-iu';
import { Erros, booleano, objeto, opcao, opcoes, texto } from './validacao';

export const TIPOS_PERDA_ANAL = ['SOLIDAS', 'LIQUIDAS', 'GASES'] as const;
export type TipoPerdaAnal = (typeof TIPOS_PERDA_ANAL)[number];
export const SUBTIPOS_PERDA_ANAL = ['URGENCIA', 'PASSIVA', 'POS_DEFECATORIA'] as const;
export type SubtipoPerdaAnal = (typeof SUBTIPOS_PERDA_ANAL)[number];
/** Categorias do serviço (não são os tipos de nenhuma escala). */
export const CONSISTENCIAS_FEZES = ['SOLIDA', 'PASTOSA', 'LIQUIDA'] as const;
export type ConsistenciaFezes = (typeof CONSISTENCIAS_FEZES)[number];
export const ORIGENS_INFORMACAO = ['PACIENTE', 'PROFISSIONAL'] as const;
export type OrigemInformacao = (typeof ORIGENS_INFORMACAO)[number];
export const SINAIS_ALARME_ANAL = ['MUDANCA_HABITO_INTESTINAL', 'PERDA_PESO_INEXPLICADA', 'ANEMIA', 'SANGRAMENTO'] as const;
export type SinalAlarmeAnal = (typeof SINAIS_ALARME_ANAL)[number];

export interface ModuloIncontinenciaAnal {
  historia?: { causa?: string; fatoresRisco?: string; duracao?: string; gravidade?: string };
  tipoPerda?: TipoPerdaAnal[];
  subtipo?: SubtipoPerdaAnal[];
  /** origemInformacao é obrigatória quando há consistência. */
  consistenciaFezes?: { consistencia?: ConsistenciaFezes; origemInformacao?: OrigemInformacao };
  exameFisico?: { inspecaoPerianal?: ItemExame; retalDigital?: ItemExame };
  sinaisAlarme?: SinalAlarmeAnal[];
  /** Sem alerta de período (não há período mínimo verificado). */
  diarioIntestinal?: Diario;
}

export const AVISOS_ANAL = {
  // TODO(legal): competência do enfermeiro para o toque retal não verificada.
  toqueCompetencia: 'Competência do enfermeiro para este exame não verificada — confirme a base legal',
  sinalAlarme: 'Sinal de alarme registrado — avalie encaminhamento.',
} as const;

function validarItemExame(v: unknown, campo: string, e: Erros): void {
  const o = objeto(v, campo, ['realizado', 'achado'], e);
  if (!o) return;
  booleano(o.realizado, `${campo}.realizado`, e, true);
  texto(o.achado, `${campo}.achado`, e);
}

export function validarModuloIncontinenciaAnal(dados: unknown): string[] {
  const e = new Erros();
  const m = objeto(dados, 'INCONTINENCIA_ANAL', ['historia', 'tipoPerda', 'subtipo', 'consistenciaFezes', 'exameFisico', 'sinaisAlarme', 'diarioIntestinal'], e);
  if (!m) return e.lista;

  if (m.historia !== undefined) {
    const h = objeto(m.historia, 'historia', ['causa', 'fatoresRisco', 'duracao', 'gravidade'], e);
    if (h) for (const k of ['causa', 'fatoresRisco', 'duracao', 'gravidade']) texto(h[k], `historia.${k}`, e);
  }
  opcoes(m.tipoPerda, 'tipoPerda', TIPOS_PERDA_ANAL, e);
  opcoes(m.subtipo, 'subtipo', SUBTIPOS_PERDA_ANAL, e);
  if (m.consistenciaFezes !== undefined) {
    const c = objeto(m.consistenciaFezes, 'consistenciaFezes', ['consistencia', 'origemInformacao'], e);
    if (c) {
      const consistencia = opcao(c.consistencia, 'consistenciaFezes.consistencia', CONSISTENCIAS_FEZES, e);
      opcao(c.origemInformacao, 'consistenciaFezes.origemInformacao', ORIGENS_INFORMACAO, e, consistencia !== undefined);
    }
  }
  if (m.exameFisico !== undefined) {
    const x = objeto(m.exameFisico, 'exameFisico', ['inspecaoPerianal', 'retalDigital'], e);
    if (x) {
      if (x.inspecaoPerianal !== undefined) validarItemExame(x.inspecaoPerianal, 'exameFisico.inspecaoPerianal', e);
      if (x.retalDigital !== undefined) validarItemExame(x.retalDigital, 'exameFisico.retalDigital', e);
    }
  }
  opcoes(m.sinaisAlarme, 'sinaisAlarme', SINAIS_ALARME_ANAL, e);
  if (m.diarioIntestinal !== undefined) validarDiario(m.diarioIntestinal, 'diarioIntestinal', e);
  return e.lista;
}

/** Alertas que NÃO bloqueiam. Diário intestinal: nenhum alerta de período. */
export function alertasModuloIncontinenciaAnal(m: ModuloIncontinenciaAnal | undefined): string[] {
  return m?.sinaisAlarme && m.sinaisAlarme.length > 0 ? [AVISOS_ANAL.sinalAlarme] : [];
}
