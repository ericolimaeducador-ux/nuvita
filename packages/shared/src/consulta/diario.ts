import { Erros, data, diasNoPeriodo, listaIds, objeto, texto } from './validacao';

/** Diário (miccional ou intestinal) em papel: período, fotos/PDF anexados à consulta e um resumo. */
export interface Diario {
  dataInicio?: string;
  dataFim?: string;
  /** Ids de anexos da PRÓPRIA consulta (consultas_enfermagem_anexos). */
  anexos?: string[];
  resumo?: string;
}

export function validarDiario(v: unknown, campo: string, e: Erros): void {
  const o = objeto(v, campo, ['dataInicio', 'dataFim', 'anexos', 'resumo'], e);
  if (!o) return;
  const inicio = data(o.dataInicio, `${campo}.dataInicio`, e);
  const fim = data(o.dataFim, `${campo}.dataFim`, e);
  if (inicio && fim && fim < inicio) e.add(`${campo}.dataFim`, 'anterior a data de inicio');
  listaIds(o.anexos, `${campo}.anexos`, e);
  texto(o.resumo, `${campo}.resumo`, e);
}

/** Alerta (não bloqueia) quando o período cobre menos de `minimoDias` dias. */
export function periodoCurto(d: Diario | undefined, minimoDias: number): boolean {
  if (!d?.dataInicio || !d.dataFim || d.dataFim < d.dataInicio) return false;
  return diasNoPeriodo(d.dataInicio, d.dataFim) < minimoDias;
}
