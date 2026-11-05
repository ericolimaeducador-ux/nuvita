/**
 * Módulo de avaliação de INCONTINÊNCIA URINÁRIA (etapa 5b). Conteúdo restrito ao que foi especificado a partir do
 * Compêndio Científico de Estomaterapia (caps. 4, 16 e 18). Nenhum instrumento com itens (ICIQ etc. ficam para a 5e),
 * nenhuma conduta automática, nenhuma gravidade calculada: só registro.
 * TODO(conteudo): rótulos dos tipos de IU e dos itens para revisão.
 */
import { Diario, periodoCurto, validarDiario } from './diario';
import { Erros, booleano, numeroNaoNegativo, objeto, opcao, texto } from './validacao';

export const TIPOS_IU = ['ESFORCO', 'URGENCIA', 'MISTA', 'INDEFINIDA'] as const;
export type TipoIU = (typeof TIPOS_IU)[number];
export const PREDOMINANTES_IU = ['ESFORCO', 'URGENCIA'] as const;
export type PredominanteIU = (typeof PREDOMINANTES_IU)[number];
export const METODOS_RPM = ['ULTRASSOM', 'CATETERISMO'] as const;
export type MetodoRPM = (typeof METODOS_RPM)[number];
export const RESULTADOS_FITA = ['POSITIVO', 'NEGATIVO', 'NAO_REALIZADO'] as const;
export type ResultadoFita = (typeof RESULTADOS_FITA)[number];

export const ITENS_EXAME_FISICO_IU = ['abdominal', 'testeEsforcoTosse', 'neurourologicoFocado', 'vaginalDigital', 'retalDigital'] as const;
export type ItemExameFisicoIU = (typeof ITENS_EXAME_FISICO_IU)[number];
export const ITENS_FITA = ['sangue', 'glicose', 'proteina', 'leucocitos', 'nitritos'] as const;
export type ItemFita = (typeof ITENS_FITA)[number];

export interface ItemExame {
  realizado: boolean;
  achado?: string;
}

export interface ModuloIU {
  anamnese?: { sintomas?: string; comorbidades?: string; fatoresPredisponentesPrecipitantes?: string };
  /** MISTA exige `predominante` (o NICE manda tratar o sintoma predominante). */
  classificacaoInicial?: { tipo?: TipoIU; predominante?: PredominanteIU };
  /** vaginalDigital e retalDigital NUNCA são obrigatórios (competência do enfermeiro não verificada). */
  exameFisico?: Partial<Record<ItemExameFisicoIU, ItemExame>>;
  residuoPosMiccional?: { realizado: boolean; volumeMl?: number; metodo?: MetodoRPM };
  /** Opcional, fora do fluxo principal (NICE NG123 veda o uso de rotina). */
  testeAbsorvente?: { realizado: boolean; protocolo?: string; resultado?: string };
  urinaliseFita?: Partial<Record<ItemFita, ResultadoFita>>;
  urodinamica?: { encaminhamentoIndicado: boolean; motivo?: string };
  diarioMiccional?: Diario;
}

export const DIAS_MINIMOS_DIARIO_MICCIONAL = 3;

/** Avisos FIXOS da tela (textos especificados; sem decisão automática). */
export const AVISOS_IU = {
  // TODO(legal): competência do enfermeiro para o toque vaginal/retal não verificada.
  toqueCompetencia: 'Competência do enfermeiro para este exame não verificada — confirme a base legal',
  rpmMetodo: 'Ultrassom (bladder scan) é preferível ao cateterismo.',
  rpmConflito:
    'EAU 2026: medir em todo paciente com sintomas do trato urinário inferior. NICE NG123: só com sintomas de disfunção de esvaziamento ou infecção urinária de repetição. A decisão é clínica.',
  testeAbsorvente: 'Não é etapa padrão da avaliação (NICE NG123 veda o uso de rotina).',
  urodinamica: 'Não é exame de avaliação inicial; é critério de encaminhamento.',
  diarioCurto: 'O diário miccional deve cobrir no mínimo 3 dias.',
} as const;

function validarItemExame(v: unknown, campo: string, e: Erros): void {
  const o = objeto(v, campo, ['realizado', 'achado'], e);
  if (!o) return;
  booleano(o.realizado, `${campo}.realizado`, e, true);
  texto(o.achado, `${campo}.achado`, e);
}

/** Valida os dados do módulo IU. Devolve a lista de erros (vazia = válido). */
export function validarModuloIU(dados: unknown): string[] {
  const e = new Erros();
  const m = objeto(dados, 'IU', ['anamnese', 'classificacaoInicial', 'exameFisico', 'residuoPosMiccional', 'testeAbsorvente', 'urinaliseFita', 'urodinamica', 'diarioMiccional'], e);
  if (!m) return e.lista;

  if (m.anamnese !== undefined) {
    const a = objeto(m.anamnese, 'anamnese', ['sintomas', 'comorbidades', 'fatoresPredisponentesPrecipitantes'], e);
    if (a) for (const k of ['sintomas', 'comorbidades', 'fatoresPredisponentesPrecipitantes']) texto(a[k], `anamnese.${k}`, e);
  }
  if (m.classificacaoInicial !== undefined) {
    const c = objeto(m.classificacaoInicial, 'classificacaoInicial', ['tipo', 'predominante'], e);
    if (c) {
      const tipo = opcao(c.tipo, 'classificacaoInicial.tipo', TIPOS_IU, e);
      const pred = opcao(c.predominante, 'classificacaoInicial.predominante', PREDOMINANTES_IU, e, tipo === 'MISTA');
      if (pred !== undefined && tipo !== 'MISTA') e.add('classificacaoInicial.predominante', 'so se aplica a IU mista');
    }
  }
  if (m.exameFisico !== undefined) {
    const x = objeto(m.exameFisico, 'exameFisico', ITENS_EXAME_FISICO_IU, e);
    if (x) for (const item of ITENS_EXAME_FISICO_IU) if (x[item] !== undefined) validarItemExame(x[item], `exameFisico.${item}`, e);
  }
  if (m.residuoPosMiccional !== undefined) {
    const r = objeto(m.residuoPosMiccional, 'residuoPosMiccional', ['realizado', 'volumeMl', 'metodo'], e);
    if (r) {
      booleano(r.realizado, 'residuoPosMiccional.realizado', e, true);
      numeroNaoNegativo(r.volumeMl, 'residuoPosMiccional.volumeMl', e);
      opcao(r.metodo, 'residuoPosMiccional.metodo', METODOS_RPM, e);
    }
  }
  if (m.testeAbsorvente !== undefined) {
    const t = objeto(m.testeAbsorvente, 'testeAbsorvente', ['realizado', 'protocolo', 'resultado'], e);
    if (t) {
      booleano(t.realizado, 'testeAbsorvente.realizado', e, true);
      texto(t.protocolo, 'testeAbsorvente.protocolo', e);
      texto(t.resultado, 'testeAbsorvente.resultado', e);
    }
  }
  if (m.urinaliseFita !== undefined) {
    const f = objeto(m.urinaliseFita, 'urinaliseFita', ITENS_FITA, e);
    if (f) for (const item of ITENS_FITA) opcao(f[item], `urinaliseFita.${item}`, RESULTADOS_FITA, e);
  }
  if (m.urodinamica !== undefined) {
    const u = objeto(m.urodinamica, 'urodinamica', ['encaminhamentoIndicado', 'motivo'], e);
    if (u) {
      booleano(u.encaminhamentoIndicado, 'urodinamica.encaminhamentoIndicado', e, true);
      texto(u.motivo, 'urodinamica.motivo', e);
    }
  }
  if (m.diarioMiccional !== undefined) validarDiario(m.diarioMiccional, 'diarioMiccional', e);
  return e.lista;
}

/** Alertas que NÃO bloqueiam (mostrados na tela). */
export function alertasModuloIU(m: ModuloIU | undefined): string[] {
  return periodoCurto(m?.diarioMiccional, DIAS_MINIMOS_DIARIO_MICCIONAL) ? [AVISOS_IU.diarioCurto] : [];
}
