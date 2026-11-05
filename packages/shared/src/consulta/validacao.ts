/**
 * Mini-validador sem dependências (API e web usam o mesmo). Recusa chave desconhecida (como o whitelist do backend) e
 * devolve só NOMES de campo nos erros — nunca o valor digitado (pode ser dado clínico).
 */
export const TEXTO_MAX = 20000;

export class Erros {
  readonly lista: string[] = [];

  add(campo: string, motivo: string): void {
    this.lista.push(`${campo}: ${motivo}`);
  }
}

export type Obj = Record<string, unknown>;

export function ehObjeto(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Objeto com só as chaves permitidas. Devolve null (e registra o erro) se não for objeto. */
export function objeto(v: unknown, campo: string, permitidas: readonly string[], e: Erros): Obj | null {
  if (!ehObjeto(v)) {
    e.add(campo, 'deve ser um objeto');
    return null;
  }
  for (const k of Object.keys(v)) if (!permitidas.includes(k)) e.add(`${campo}.${k}`, 'campo nao permitido');
  return v;
}

export function texto(v: unknown, campo: string, e: Erros, obrigatorio = false): string | undefined {
  if (v === undefined || v === null) {
    if (obrigatorio) e.add(campo, 'obrigatorio');
    return undefined;
  }
  if (typeof v !== 'string') {
    e.add(campo, 'deve ser texto');
    return undefined;
  }
  if (v.length > TEXTO_MAX) e.add(campo, 'texto longo demais');
  return v;
}

export function booleano(v: unknown, campo: string, e: Erros, obrigatorio = false): boolean | undefined {
  if (v === undefined || v === null) {
    if (obrigatorio) e.add(campo, 'obrigatorio');
    return undefined;
  }
  if (typeof v !== 'boolean') e.add(campo, 'deve ser verdadeiro ou falso');
  return typeof v === 'boolean' ? v : undefined;
}

export function opcao<T extends string>(v: unknown, campo: string, valores: readonly T[], e: Erros, obrigatorio = false): T | undefined {
  if (v === undefined || v === null) {
    if (obrigatorio) e.add(campo, 'obrigatorio');
    return undefined;
  }
  if (typeof v !== 'string' || !(valores as readonly string[]).includes(v)) {
    e.add(campo, 'valor invalido');
    return undefined;
  }
  return v as T;
}

export function opcoes<T extends string>(v: unknown, campo: string, valores: readonly T[], e: Erros): T[] | undefined {
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v)) {
    e.add(campo, 'deve ser uma lista');
    return undefined;
  }
  if (new Set(v).size !== v.length) e.add(campo, 'valor repetido');
  v.forEach((x, i) => opcao(x, `${campo}[${i}]`, valores, e, true));
  return v as T[];
}

export function numeroNaoNegativo(v: unknown, campo: string, e: Erros): number | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
    e.add(campo, 'deve ser um numero nao negativo');
    return undefined;
  }
  return v;
}

/** Data de calendário AAAA-MM-DD. */
export function data(v: unknown, campo: string, e: Erros): string | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`))) {
    e.add(campo, 'data invalida (AAAA-MM-DD)');
    return undefined;
  }
  return v;
}

export function listaIds(v: unknown, campo: string, e: Erros): string[] | undefined {
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v)) {
    e.add(campo, 'deve ser uma lista');
    return undefined;
  }
  if (v.length > 50) e.add(campo, 'itens demais');
  v.forEach((x, i) => {
    if (typeof x !== 'string' || !/^[0-9a-f]{24}$/i.test(x)) e.add(`${campo}[${i}]`, 'id invalido');
  });
  return v as string[];
}

/** Dias cobertos por um período fechado [inicio, fim] (inclusive). */
export function diasNoPeriodo(inicio: string, fim: string): number {
  return Math.round((Date.parse(`${fim}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) / 86400000) + 1;
}
