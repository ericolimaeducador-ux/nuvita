/**
 * Módulo de avaliação de FERIDA (etapa 5c), liberado para paciente com classificação FA. Conteúdo restrito ao especificado
 * pelo Erico a partir do Compêndio Científico de Estomaterapia. SÓ REGISTRO:
 *  - nenhuma escala com itens (PUSH, RESVECH, Braden… ficam para a 5e), nenhum escore, nenhum semáforo;
 *  - nenhuma conduta automática (cobertura, compressão, antibiótico) e nenhuma sugestão de material;
 *  - ZERO IA: nenhuma categoria/estágio/infecção é sugerida a partir de foto; a medição por foto é geometria sobre pontos
 *    marcados pelo enfermeiro (geometria-ferida.ts).
 * Listas marcadas [PROTOCOLO DO SERVIÇO] são do serviço, NÃO padrão de norma (a tela mostra "protocolo do serviço").
 * TODO(conteudo): rótulos de todas as listas para revisão.
 */
import { CalibracaoFoto, Ponto, ResultadoMedicaoFoto, calcularMedicaoFoto, errosCalibracao, errosContorno } from './geometria-ferida';
import { EtiologiaLesao } from './lesao';
import { Erros, booleano, ehObjeto, numeroNaoNegativo, objeto, opcao, opcoes, texto } from './validacao';

// ---------------- listas ----------------

/** Os três últimos NÃO são degraus entre I e IV: nunca ordenar nem comparar como sequência. */
export const CATEGORIAS_LPP = ['I', 'II', 'III', 'IV', 'NAO_CLASSIFICAVEL', 'SUSPEITA_LESAO_TISSULAR_PROFUNDA', 'MUCOSA'] as const;
export type CategoriaLPP = (typeof CATEGORIAS_LPP)[number];
export const TECNICAS_ERITEMA = ['PRESSAO_DIGITAL', 'DISCO_TRANSPARENTE', 'NAO_REALIZADA'] as const;
export type TecnicaEritema = (typeof TECNICAS_ERITEMA)[number];

/** [PROTOCOLO DO SERVIÇO] */
export const TECIDOS = ['GRANULACAO', 'EPITELIZACAO', 'HIPERGRANULACAO', 'ESFACELO', 'NECROSE_SECA', 'NECROSE_UMIDA'] as const;
export type Tecido = (typeof TECIDOS)[number];
export const ESTRUTURAS_EXPOSTAS = ['OSSO', 'TENDAO', 'MUSCULO'] as const;
export type EstruturaExposta = (typeof ESTRUTURAS_EXPOSTAS)[number];

/** [PROTOCOLO DO SERVIÇO] */
export const QUANTIDADES_EXSUDATO = ['AUSENTE', 'POUCO', 'MODERADO', 'ABUNDANTE'] as const;
export type QuantidadeExsudato = (typeof QUANTIDADES_EXSUDATO)[number];
/** [PROTOCOLO DO SERVIÇO] */
export const ASPECTOS_EXSUDATO = ['SEROSO', 'SANGUINOLENTO', 'SEROSSANGUINOLENTO', 'SEROPURULENTO', 'PURULENTO'] as const;
export type AspectoExsudato = (typeof ASPECTOS_EXSUDATO)[number];
export const ODORES_EXSUDATO = ['AUSENTE', 'PRESENTE'] as const;
export type OdorExsudato = (typeof ODORES_EXSUDATO)[number];

/** [PROTOCOLO DO SERVIÇO] */
export const CARACTERISTICAS_BORDA = ['REGULAR', 'IRREGULAR', 'ADERIDA', 'DESCOLADA_SOLAPADA', 'MACERADA', 'HIPERQUERATOSE', 'EPIBOLE'] as const;
export type CaracteristicaBorda = (typeof CARACTERISTICAS_BORDA)[number];

/** [PROTOCOLO DO SERVIÇO] INTEGRA exclui as demais. */
export const ACHADOS_PELE_PERILESIONAL = [
  'INTEGRA', 'ERITEMA', 'EDEMA', 'MACERACAO', 'DESCAMACAO', 'HIPERPIGMENTACAO', 'ENDURECIMENTO', 'CALOR_LOCAL', 'PRURIDO',
] as const;
export type AchadoPelePerilesional = (typeof ACHADOS_PELE_PERILESIONAL)[number];

/** Sinais do continuum de infecção (compêndio). Sem escore e sem nível calculado. */
export const SINAIS_INFECCAO_ENCOBERTOS = [
  'GRANULACAO_EXCESSIVA', 'GRANULACAO_FRIAVEL', 'PONTE_BOLSAS', 'AUMENTO_DEGRADACAO', 'CICATRIZACAO_LENTA', 'DOR_NOVA_OU_PIORA', 'ODOR_MAIS_FORTE',
] as const;
export type SinalInfeccaoEncoberto = (typeof SINAIS_INFECCAO_ENCOBERTOS)[number];
export const SINAIS_INFECCAO_MANIFESTOS = [
  'RUBOR', 'CALOR', 'EDEMA', 'SECRECAO_PURULENTA', 'RUBOR_EM_DISSEMINACAO', 'LINFANGITE', 'CREPITACAO',
] as const;
export type SinalInfeccaoManifesto = (typeof SINAIS_INFECCAO_MANIFESTOS)[number];

export const DESFECHOS_AVALIACAO_LESAO = ['EM_ACOMPANHAMENTO', 'CICATRIZADA', 'ENCERRADA'] as const;
export type DesfechoAvaliacaoLesao = (typeof DESFECHOS_AVALIACAO_LESAO)[number];

export const MEMBROS_ITB = ['DIREITO', 'ESQUERDO'] as const;
export type MembroITB = (typeof MEMBROS_ITB)[number];
export const FINALIDADES_ITB = ['DIAGNOSTICO_DAP', 'SEGURANCA_COMPRESSAO'] as const;
export type FinalidadeITB = (typeof FINALIDADES_ITB)[number];

// ---------------- tipos ----------------

export interface ObservacaoAdesivo {
  /** Data-hora ISO 8601 com fuso (ex.: 2026-11-06T13:00:00.000Z). */
  em?: string;
  achado?: string;
}

export interface FotoMedida {
  /** Anexo da PRÓPRIA consulta, imagem, vinculado à mesma lesão. */
  anexoId: string;
  calibracao: CalibracaoFoto;
  contorno: Ponto[];
  /** Sempre RECALCULADO pela API a partir da calibração e do contorno (o valor do cliente é ignorado). */
  resultado?: ResultadoMedicaoFoto;
}

export interface AvaliacaoLesao {
  lesaoId: string;
  /** Obrigatório (com categoria) se a etiologia da lesão é LESAO_POR_PRESSAO; proibido nas demais. */
  lpp?: { categoria?: CategoriaLPP; tecnicaEritema?: TecnicaEritema };
  /** Obrigatório se a etiologia é LESAO_ADESIVO_MEDICO; proibido nas demais. */
  lesaoAdesivo?: { observacaoRemocao?: ObservacaoAdesivo; observacao30min?: ObservacaoAdesivo };
  tecido?: { percentuais?: Partial<Record<Tecido, number>>; estruturasExpostas?: EstruturaExposta[] };
  exsudato?: { quantidade?: QuantidadeExsudato; aspecto?: AspectoExsudato; odor?: OdorExsudato };
  borda?: { caracteristicas?: CaracteristicaBorda[]; tuneis?: Array<{ profundidadeCm?: number; posicaoHora?: number }> };
  pelePerilesional?: AchadoPelePerilesional[];
  infeccao?: {
    sinaisEncobertos?: SinalInfeccaoEncoberto[];
    sinaisManifestos?: SinalInfeccaoManifesto[];
    respostaSistemica?: boolean;
    suspeitaBiofilme?: boolean;
    impressaoClinica?: string;
  };
  medidas?: {
    manual?: { comprimentoCm?: number; larguraCm?: number; profundidadeCm?: number };
    fotos?: FotoMedida[];
  };
  materiais?: Array<{ produtoCodigo?: number; descricao?: string }>;
  desfecho?: { situacao?: DesfechoAvaliacaoLesao; motivo?: string };
}

export interface MedidaITB {
  membro?: MembroITB;
  /** Decimal com até 2 casas, 0,10–3,00. */
  valor?: number;
  /** OBRIGATÓRIA: a faixa de diagnóstico não serve para decidir compressão. */
  finalidade?: FinalidadeITB;
  metodoEquipamento?: string;
}

export interface ModuloFerida {
  avaliacoes?: AvaliacaoLesao[];
  itb?: MedidaITB[];
}

// ---------------- avisos fixos (textos especificados) ----------------

export const AVISOS_FERIDA = {
  lppNaoClassificavel: 'No calcâneo, escara seca e intacta pode funcionar como proteção natural e não deve ser removida.',
  lppMucosa: 'Lesão em mucosa não se classifica pelo sistema cutâneo.',
  lppPeleEscura:
    'Detecção de eritema e alteração de cor é mais difícil em pele de tom escuro; temperatura e umidade subepidérmica são adjuvantes.',
  adesivo30min: 'Registre a segunda observação 30 minutos ou mais após a remoção do adesivo.',
  respostaSistemica: 'Resposta sistêmica registrada — encaminhamento e tratamento imediatos.',
  biofilme: 'Não há método validado à beira do leito para afirmar biofilme.',
  estimativaImagem: 'estimativa por imagem',
} as const;

/** Rótulo EXATO do campo (nunca "presença de biofilme"). */
export const ROTULO_SUSPEITA_BIOFILME = 'Suspeita de biofilme';

export function avisosCategoriaLpp(categoria: CategoriaLPP | undefined): string[] {
  if (categoria === 'NAO_CLASSIFICAVEL') return [AVISOS_FERIDA.lppNaoClassificavel];
  if (categoria === 'MUCOSA') return [AVISOS_FERIDA.lppMucosa];
  if (categoria === 'I' || categoria === 'SUSPEITA_LESAO_TISSULAR_PROFUNDA') return [AVISOS_FERIDA.lppPeleEscura];
  return [];
}

// ---------------- ITB ----------------

export const ITB_MIN = 0.1;
export const ITB_MAX = 3.0;

export const AVISOS_ITB = {
  faixaDiagnosticoNaoDecideCompressao: 'A faixa de diagnóstico não serve para decidir compressão.',
  naoConfiavel: 'Índice não confiável (possível calcificação).',
  referenciaDiagnostico: 'faixa de diagnóstico 0,90–1,40',
} as const;

/**
 * Regiões INFORMATIVAS do ITB com finalidade SEGURANCA_COMPRESSAO. Nunca "pode comprimir"/"não comprimir".
 * FRONTEIRAS (em centésimos, para evitar erro de ponto flutuante — decisão do projeto, testada):
 *   v < 0,60                -> FORA_ESCOPO
 *   0,60 <= v < 0,80        -> CONFLITO
 *   0,80 <= v <= 1,20       -> TODAS_ADMITEM   (as duas pontas inclusivas)
 *   1,20 <  v <= 1,30       -> CONFLITO
 *   1,30 <  v <= 1,40       -> FORA_FAIXA
 *   v > 1,40                -> nenhuma região (só o aviso de índice não confiável)
 * TODO(conteudo): confirmar com o Erico a inclusividade das fronteiras 0,80 / 1,20 / 1,30 / 1,40.
 */
export type RegiaoItbCompressao = 'FORA_ESCOPO' | 'CONFLITO' | 'TODAS_ADMITEM' | 'FORA_FAIXA';

export const TEXTOS_REGIAO_ITB: Record<RegiaoItbCompressao, string> = {
  FORA_ESCOPO: 'fora do escopo verificado',
  CONFLITO: 'conflito entre diretrizes',
  TODAS_ADMITEM: 'faixa em que todas as fontes compiladas admitem compressão',
  FORA_FAIXA: 'fora da faixa de compressão de todas as fontes compiladas',
};

const centesimos = (v: number) => Math.round(v * 100);

export function regiaoItbCompressao(valor: number): RegiaoItbCompressao | null {
  const c = centesimos(valor);
  if (c > 140) return null;
  if (c < 60) return 'FORA_ESCOPO';
  if (c < 80) return 'CONFLITO';
  if (c <= 120) return 'TODAS_ADMITEM';
  if (c <= 130) return 'CONFLITO';
  return 'FORA_FAIXA';
}

export function itbNaoConfiavel(valor: number): boolean {
  return centesimos(valor) > 140;
}

/** Textos informativos de uma medida de ITB (nenhuma conclusão, nenhuma conduta). */
export function avisosItb(m: MedidaITB | undefined): string[] {
  if (!m || typeof m.valor !== 'number' || !Number.isFinite(m.valor)) return [];
  const avisos: string[] = [];
  if (itbNaoConfiavel(m.valor)) avisos.push(AVISOS_ITB.naoConfiavel);
  if (m.finalidade === 'SEGURANCA_COMPRESSAO') {
    const regiao = regiaoItbCompressao(m.valor);
    if (regiao) avisos.push(TEXTOS_REGIAO_ITB[regiao]);
  } else if (m.finalidade === 'DIAGNOSTICO_DAP') {
    avisos.push(AVISOS_ITB.referenciaDiagnostico);
  }
  return avisos;
}

// ---------------- validação ----------------

const ISO_DATA_HORA = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const MAX_AVALIACOES = 20;
const MAX_FOTOS = 10;
const MAX_TUNEIS = 12;
const MAX_MATERIAIS = 50;
/** Teto só contra payload abusivo (não é referência clínica). */
const MEDIDA_MAX_CM = 1000;
const MIN_30_MS = 30 * 60 * 1000;

function dataHora(v: unknown, campo: string, e: Erros, obrigatorio: boolean): number | undefined {
  if (v === undefined || v === null || v === '') {
    if (obrigatorio) e.add(campo, 'obrigatorio');
    return undefined;
  }
  if (typeof v !== 'string' || !ISO_DATA_HORA.test(v) || Number.isNaN(Date.parse(v))) {
    e.add(campo, 'data-hora invalida (ISO 8601 com fuso)');
    return undefined;
  }
  return Date.parse(v);
}

function medidaCm(v: unknown, campo: string, e: Erros): number | undefined {
  const n = numeroNaoNegativo(v, campo, e);
  if (n !== undefined && n > MEDIDA_MAX_CM) e.add(campo, 'valor fora do limite');
  return n;
}

function idMongo(v: unknown, campo: string, e: Erros): string | undefined {
  if (typeof v !== 'string' || !/^[0-9a-f]{24}$/i.test(v)) {
    e.add(campo, 'id invalido');
    return undefined;
  }
  return v;
}

function lista(v: unknown, campo: string, max: number, e: Erros): unknown[] | undefined {
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v)) {
    e.add(campo, 'deve ser uma lista');
    return undefined;
  }
  if (v.length > max) e.add(campo, 'itens demais');
  return v;
}

function validarFoto(v: unknown, campo: string, e: Erros): void {
  const f = objeto(v, campo, ['anexoId', 'calibracao', 'contorno', 'resultado'], e);
  if (!f) return;
  idMongo(f.anexoId, `${campo}.anexoId`, e);
  for (const msg of errosCalibracao(f.calibracao)) e.add(`${campo}.calibracao`, msg);
  if (ehObjeto(f.calibracao)) objeto(f.calibracao, `${campo}.calibracao`, ['p1', 'p2', 'distanciaCm'], e);
  for (const msg of errosContorno(f.contorno)) e.add(`${campo}.contorno`, msg);
  // `resultado` pode vir do cliente, mas é ignorado e recalculado (normalizarModuloFerida).
}

function validarAvaliacao(v: unknown, campo: string, e: Erros): string | undefined {
  const a = objeto(v, campo, ['lesaoId', 'lpp', 'lesaoAdesivo', 'tecido', 'exsudato', 'borda', 'pelePerilesional', 'infeccao', 'medidas', 'materiais', 'desfecho'], e);
  if (!a) return undefined;
  const lesaoId = idMongo(a.lesaoId, `${campo}.lesaoId`, e);

  if (a.lpp !== undefined) {
    const l = objeto(a.lpp, `${campo}.lpp`, ['categoria', 'tecnicaEritema'], e);
    if (l) {
      opcao(l.categoria, `${campo}.lpp.categoria`, CATEGORIAS_LPP, e, true);
      opcao(l.tecnicaEritema, `${campo}.lpp.tecnicaEritema`, TECNICAS_ERITEMA, e);
    }
  }

  if (a.lesaoAdesivo !== undefined) {
    const ad = objeto(a.lesaoAdesivo, `${campo}.lesaoAdesivo`, ['observacaoRemocao', 'observacao30min'], e);
    if (ad) {
      const obs = (k: 'observacaoRemocao' | 'observacao30min') => {
        const o = objeto(ad[k], `${campo}.lesaoAdesivo.${k}`, ['em', 'achado'], e);
        if (!o) return undefined;
        texto(o.achado, `${campo}.lesaoAdesivo.${k}.achado`, e);
        return dataHora(o.em, `${campo}.lesaoAdesivo.${k}.em`, e, true);
      };
      const remocao = obs('observacaoRemocao');
      const trinta = obs('observacao30min');
      if (remocao !== undefined && trinta !== undefined && trinta < remocao + MIN_30_MS) {
        e.add(`${campo}.lesaoAdesivo.observacao30min.em`, AVISOS_FERIDA.adesivo30min);
      }
    }
  }

  if (a.tecido !== undefined) {
    const t = objeto(a.tecido, `${campo}.tecido`, ['percentuais', 'estruturasExpostas'], e);
    if (t) {
      if (t.percentuais !== undefined) {
        const p = objeto(t.percentuais, `${campo}.tecido.percentuais`, TECIDOS, e);
        if (p) {
          let soma = 0;
          let validos = true;
          for (const k of TECIDOS) {
            const x = p[k];
            if (x === undefined || x === null) continue;
            if (typeof x !== 'number' || !Number.isInteger(x) || x < 0 || x > 100) {
              e.add(`${campo}.tecido.percentuais.${k}`, 'inteiro de 0 a 100');
              validos = false;
              continue;
            }
            soma += x;
          }
          if (validos && soma !== 100) e.add(`${campo}.tecido.percentuais`, 'a soma dos percentuais deve ser 100');
        }
      }
      opcoes(t.estruturasExpostas, `${campo}.tecido.estruturasExpostas`, ESTRUTURAS_EXPOSTAS, e);
    }
  }

  if (a.exsudato !== undefined) {
    const x = objeto(a.exsudato, `${campo}.exsudato`, ['quantidade', 'aspecto', 'odor'], e);
    if (x) {
      const qtd = opcao(x.quantidade, `${campo}.exsudato.quantidade`, QUANTIDADES_EXSUDATO, e, true);
      const aspecto = opcao(x.aspecto, `${campo}.exsudato.aspecto`, ASPECTOS_EXSUDATO, e, qtd !== undefined && qtd !== 'AUSENTE');
      if (qtd === 'AUSENTE' && aspecto !== undefined) e.add(`${campo}.exsudato.aspecto`, 'nao se aplica a exsudato ausente');
      opcao(x.odor, `${campo}.exsudato.odor`, ODORES_EXSUDATO, e);
    }
  }

  if (a.borda !== undefined) {
    const b = objeto(a.borda, `${campo}.borda`, ['caracteristicas', 'tuneis'], e);
    if (b) {
      opcoes(b.caracteristicas, `${campo}.borda.caracteristicas`, CARACTERISTICAS_BORDA, e);
      const tuneis = lista(b.tuneis, `${campo}.borda.tuneis`, MAX_TUNEIS, e);
      tuneis?.forEach((tv, i) => {
        const c = `${campo}.borda.tuneis[${i}]`;
        const tun = objeto(tv, c, ['profundidadeCm', 'posicaoHora'], e);
        if (!tun) return;
        const prof = medidaCm(tun.profundidadeCm, `${c}.profundidadeCm`, e);
        if (tun.profundidadeCm === undefined || tun.profundidadeCm === null) e.add(`${c}.profundidadeCm`, 'obrigatorio');
        else if (prof === 0) e.add(`${c}.profundidadeCm`, 'deve ser maior que zero');
        const h = tun.posicaoHora;
        if (typeof h !== 'number' || !Number.isInteger(h) || h < 1 || h > 12) e.add(`${c}.posicaoHora`, 'inteiro de 1 a 12');
      });
    }
  }

  const pele = opcoes(a.pelePerilesional, `${campo}.pelePerilesional`, ACHADOS_PELE_PERILESIONAL, e);
  if (pele && pele.includes('INTEGRA') && pele.length > 1) e.add(`${campo}.pelePerilesional`, 'INTEGRA exclui os demais achados');

  if (a.infeccao !== undefined) {
    const inf = objeto(a.infeccao, `${campo}.infeccao`, ['sinaisEncobertos', 'sinaisManifestos', 'respostaSistemica', 'suspeitaBiofilme', 'impressaoClinica'], e);
    if (inf) {
      opcoes(inf.sinaisEncobertos, `${campo}.infeccao.sinaisEncobertos`, SINAIS_INFECCAO_ENCOBERTOS, e);
      opcoes(inf.sinaisManifestos, `${campo}.infeccao.sinaisManifestos`, SINAIS_INFECCAO_MANIFESTOS, e);
      booleano(inf.respostaSistemica, `${campo}.infeccao.respostaSistemica`, e);
      booleano(inf.suspeitaBiofilme, `${campo}.infeccao.suspeitaBiofilme`, e);
      texto(inf.impressaoClinica, `${campo}.infeccao.impressaoClinica`, e);
    }
  }

  if (a.medidas !== undefined) {
    const m = objeto(a.medidas, `${campo}.medidas`, ['manual', 'fotos'], e);
    if (m) {
      if (m.manual !== undefined) {
        const man = objeto(m.manual, `${campo}.medidas.manual`, ['comprimentoCm', 'larguraCm', 'profundidadeCm'], e);
        if (man) for (const k of ['comprimentoCm', 'larguraCm', 'profundidadeCm']) medidaCm(man[k], `${campo}.medidas.manual.${k}`, e);
      }
      const fotos = lista(m.fotos, `${campo}.medidas.fotos`, MAX_FOTOS, e);
      fotos?.forEach((f, i) => validarFoto(f, `${campo}.medidas.fotos[${i}]`, e));
    }
  }

  const materiais = lista(a.materiais, `${campo}.materiais`, MAX_MATERIAIS, e);
  materiais?.forEach((mv, i) => {
    const c = `${campo}.materiais[${i}]`;
    const mat = objeto(mv, c, ['produtoCodigo', 'descricao'], e);
    if (!mat) return;
    const cod = mat.produtoCodigo;
    if (cod !== undefined && cod !== null && (typeof cod !== 'number' || !Number.isInteger(cod) || cod <= 0)) e.add(`${c}.produtoCodigo`, 'codigo invalido');
    const desc = texto(mat.descricao, `${c}.descricao`, e);
    const temProduto = typeof cod === 'number';
    const temDescricao = typeof desc === 'string' && desc.trim() !== '';
    if (!temProduto && !temDescricao) e.add(c, 'informe o produto do catalogo ou a descricao');
  });

  const d = a.desfecho === undefined || a.desfecho === null ? null : objeto(a.desfecho, `${campo}.desfecho`, ['situacao', 'motivo'], e);
  if (!d && (a.desfecho === undefined || a.desfecho === null)) e.add(`${campo}.desfecho`, 'obrigatorio');
  if (d) {
    const situacao = opcao(d.situacao, `${campo}.desfecho.situacao`, DESFECHOS_AVALIACAO_LESAO, e, true);
    const motivo = texto(d.motivo, `${campo}.desfecho.motivo`, e, situacao === 'ENCERRADA');
    if (situacao === 'ENCERRADA' && motivo !== undefined && motivo.trim() === '') e.add(`${campo}.desfecho.motivo`, 'obrigatorio');
    if (motivo !== undefined && situacao !== undefined && situacao !== 'ENCERRADA') e.add(`${campo}.desfecho.motivo`, 'so se aplica ao encerramento');
  }
  return lesaoId;
}

function validarItb(v: unknown, campo: string, e: Erros): MembroITB | undefined {
  const m = objeto(v, campo, ['membro', 'valor', 'finalidade', 'metodoEquipamento'], e);
  if (!m) return undefined;
  const membro = opcao(m.membro, `${campo}.membro`, MEMBROS_ITB, e, true);
  const valor = m.valor;
  if (valor === undefined || valor === null) e.add(`${campo}.valor`, 'obrigatorio');
  else if (
    typeof valor !== 'number' || !Number.isFinite(valor) ||
    Math.abs(valor * 100 - Math.round(valor * 100)) > 1e-6 ||
    centesimos(valor) < centesimos(ITB_MIN) || centesimos(valor) > centesimos(ITB_MAX)
  ) {
    e.add(`${campo}.valor`, 'decimal de 0,10 a 3,00 com ate 2 casas');
  }
  opcao(m.finalidade, `${campo}.finalidade`, FINALIDADES_ITB, e, true);
  texto(m.metodoEquipamento, `${campo}.metodoEquipamento`, e);
  return membro;
}

/** Validação ESTRUTURAL do módulo (não conhece a lesão). Erros só com nomes de campo. */
export function validarModuloFerida(dados: unknown): string[] {
  const e = new Erros();
  const m = objeto(dados, 'FERIDA', ['avaliacoes', 'itb'], e);
  if (!m) return e.lista;
  const avaliacoes = lista(m.avaliacoes, 'avaliacoes', MAX_AVALIACOES, e);
  const lesoes = new Set<string>();
  avaliacoes?.forEach((av, i) => {
    const id = validarAvaliacao(av, `avaliacoes[${i}]`, e);
    if (id && lesoes.has(id)) e.add(`avaliacoes[${i}].lesaoId`, 'lesao repetida');
    if (id) lesoes.add(id);
  });
  const itb = lista(m.itb, 'itb', MEMBROS_ITB.length, e);
  const membros = new Set<string>();
  itb?.forEach((x, i) => {
    const membro = validarItb(x, `itb[${i}]`, e);
    if (membro && membros.has(membro)) e.add(`itb[${i}].membro`, 'membro repetido');
    if (membro) membros.add(membro);
  });
  return e.lista;
}

/**
 * Regras que dependem da ETIOLOGIA da lesão: LPP exige `lpp.categoria`; adesivo médico exige as duas observações;
 * nas demais etiologias esses blocos são recusados.
 */
export function validarAvaliacaoContraLesao(av: AvaliacaoLesao, etiologia: EtiologiaLesao, campo: string): string[] {
  const e = new Erros();
  if (etiologia === 'LESAO_POR_PRESSAO') {
    if (!av.lpp?.categoria) e.add(`${campo}.lpp.categoria`, 'obrigatorio para lesao por pressao');
  } else if (av.lpp !== undefined) {
    e.add(`${campo}.lpp`, 'so se aplica a lesao por pressao');
  }
  if (etiologia === 'LESAO_ADESIVO_MEDICO') {
    if (!av.lesaoAdesivo?.observacaoRemocao) e.add(`${campo}.lesaoAdesivo.observacaoRemocao`, 'obrigatorio para lesao por adesivo medico');
    if (!av.lesaoAdesivo?.observacao30min) e.add(`${campo}.lesaoAdesivo.observacao30min`, 'obrigatorio para lesao por adesivo medico');
  } else if (av.lesaoAdesivo !== undefined) {
    e.add(`${campo}.lesaoAdesivo`, 'so se aplica a lesao por adesivo medico');
  }
  return e.lista;
}

/** Cópia do módulo com o `resultado` de cada foto RECALCULADO a partir dos pontos (o do cliente é descartado). */
export function normalizarModuloFerida(dados: ModuloFerida): ModuloFerida {
  const copia = JSON.parse(JSON.stringify(dados)) as ModuloFerida;
  for (const av of copia.avaliacoes ?? []) {
    for (const f of av.medidas?.fotos ?? []) f.resultado = calcularMedicaoFoto(f.calibracao, f.contorno);
  }
  return copia;
}

/** Ids de anexos (fotos) citados no módulo. */
export function anexosDoModuloFerida(dados: ModuloFerida | undefined): Array<{ anexoId: string; lesaoId: string }> {
  return (dados?.avaliacoes ?? []).flatMap((av) => (av.medidas?.fotos ?? []).map((f) => ({ anexoId: f.anexoId, lesaoId: av.lesaoId })));
}

/** Avisos (não bloqueiam) de uma avaliação de lesão. */
export function avisosAvaliacaoLesao(av: AvaliacaoLesao | undefined): string[] {
  if (!av) return [];
  const avisos = [...avisosCategoriaLpp(av.lpp?.categoria)];
  if (av.infeccao?.respostaSistemica) avisos.push(AVISOS_FERIDA.respostaSistemica);
  return avisos;
}

/** Pontos de medida de uma avaliação, cada um com o MÉTODO (para o histórico/gráfico). */
export type PontoMedida =
  | { metodo: 'MANUAL'; comprimentoCm?: number; larguraCm?: number; profundidadeCm?: number }
  | { metodo: 'FOTO'; anexoId: string; areaCm2: number; comprimentoCm: number; larguraCm: number };

export function pontosMedida(av: AvaliacaoLesao): PontoMedida[] {
  const pontos: PontoMedida[] = [];
  const man = av.medidas?.manual;
  if (man && (man.comprimentoCm !== undefined || man.larguraCm !== undefined || man.profundidadeCm !== undefined)) {
    pontos.push({ metodo: 'MANUAL', comprimentoCm: man.comprimentoCm, larguraCm: man.larguraCm, profundidadeCm: man.profundidadeCm });
  }
  for (const f of av.medidas?.fotos ?? []) {
    if (f.resultado) pontos.push({ metodo: 'FOTO', anexoId: f.anexoId, ...f.resultado });
  }
  return pontos;
}
