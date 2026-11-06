/**
 * Medição de ferida por foto (etapa 5c) — SÓ geometria, ZERO IA: nenhum processamento de imagem, nenhuma detecção de
 * contorno. O enfermeiro marca 2 pontos sobre a régua (calibração) e os pontos do contorno; o sistema calcula:
 *  - área = fórmula do polígono (shoelace) × escala²;
 *  - comprimento = maior distância entre dois pontos do contorno;
 *  - largura = maior extensão do contorno na direção perpendicular a esse eixo.
 * Coordenadas em pixels da imagem ORIGINAL (não da tela). A API recalcula tudo a partir dos pontos (não confia no número
 * do cliente); a web usa a mesma função para mostrar o resultado enquanto o enfermeiro marca.
 * O resultado é uma ESTIMATIVA POR IMAGEM (depende da foto: ângulo, distância, régua no mesmo plano da lesão).
 */

export interface Ponto {
  x: number;
  y: number;
}

export interface CalibracaoFoto {
  /** Dois pontos marcados sobre a régua. */
  p1: Ponto;
  p2: Ponto;
  /** Distância real entre os dois pontos, em cm (> 0). */
  distanciaCm: number;
}

export interface ResultadoMedicaoFoto {
  areaCm2: number;
  comprimentoCm: number;
  larguraCm: number;
}

export const MAX_PONTOS_CONTORNO = 500;
/** Coordenadas aceitas (pixels): cobre qualquer foto real com folga. */
export const MAX_COORDENADA = 100000;

export const ERROS_MEDICAO = {
  calibracaoDistancia: 'A distância real da calibração deve ser maior que zero.',
  calibracaoCoincidente: 'Os dois pontos da calibração não podem coincidir.',
  contornoPoucosPontos: 'Marque pelo menos 3 pontos no contorno.',
  contornoPontosDemais: `O contorno aceita no máximo ${MAX_PONTOS_CONTORNO} pontos.`,
  contornoPontoRepetido: 'O contorno tem pontos repetidos.',
  contornoAutointersecao: 'O contorno se cruza. Ajuste os pontos para formar um polígono simples.',
  contornoDegenerado: 'O contorno não tem área (pontos alinhados).',
  pontoInvalido: 'Ponto com coordenada inválida.',
} as const;

function pontoValido(p: unknown): p is Ponto {
  if (typeof p !== 'object' || p === null) return false;
  const { x, y } = p as Record<string, unknown>;
  return (
    typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y) &&
    x >= 0 && y >= 0 && x <= MAX_COORDENADA && y <= MAX_COORDENADA
  );
}

export function distancia(a: Ponto, b: Ponto): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Área do polígono (shoelace), em unidades² da coordenada. Sempre >= 0. */
export function areaPoligono(pontos: readonly Ponto[]): number {
  let soma = 0;
  for (let i = 0; i < pontos.length; i += 1) {
    const a = pontos[i];
    const b = pontos[(i + 1) % pontos.length];
    soma += a.x * b.y - b.x * a.y;
  }
  return Math.abs(soma) / 2;
}

function orientacao(a: Ponto, b: Ponto, c: Ponto): number {
  const v = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return v === 0 ? 0 : v > 0 ? 1 : -1;
}

function noSegmento(a: Ponto, b: Ponto, p: Ponto): boolean {
  return Math.min(a.x, b.x) <= p.x && p.x <= Math.max(a.x, b.x) && Math.min(a.y, b.y) <= p.y && p.y <= Math.max(a.y, b.y);
}

/** Segmentos [a,b] e [c,d] se tocam (inclui toque na ponta e sobreposição colinear). */
function segmentosSeTocam(a: Ponto, b: Ponto, c: Ponto, d: Ponto): boolean {
  const o1 = orientacao(a, b, c);
  const o2 = orientacao(a, b, d);
  const o3 = orientacao(c, d, a);
  const o4 = orientacao(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && noSegmento(a, b, c)) return true;
  if (o2 === 0 && noSegmento(a, b, d)) return true;
  if (o3 === 0 && noSegmento(c, d, a)) return true;
  if (o4 === 0 && noSegmento(c, d, b)) return true;
  return false;
}

/**
 * O polígono fechado se autointercepta? Compara cada par de arestas NÃO adjacentes; arestas adjacentes só podem
 * compartilhar o vértice comum (se forem colineares e voltarem sobre si mesmas, também é autointerseção).
 */
export function temAutointersecao(pontos: readonly Ponto[]): boolean {
  const n = pontos.length;
  if (n < 3) return false;
  for (let i = 0; i < n; i += 1) {
    const a = pontos[i];
    const b = pontos[(i + 1) % n];
    for (let j = i + 1; j < n; j += 1) {
      const c = pontos[j];
      const d = pontos[(j + 1) % n];
      const adjacentes = j === i + 1 || (i === 0 && j === n - 1);
      if (adjacentes) {
        // Adjacentes compartilham um vértice; só é problema se dobrarem uma sobre a outra (colineares em sentido oposto).
        const comum = j === i + 1 ? b : a;
        const outroI = j === i + 1 ? a : b;
        const outroJ = j === i + 1 ? d : c;
        if (orientacao(outroI, comum, outroJ) === 0) {
          const v1x = outroI.x - comum.x;
          const v1y = outroI.y - comum.y;
          const v2x = outroJ.x - comum.x;
          const v2y = outroJ.y - comum.y;
          if (v1x * v2x + v1y * v2y > 0) return true;
        }
        continue;
      }
      if (segmentosSeTocam(a, b, c, d)) return true;
    }
  }
  return false;
}

/** Comprimento (maior distância entre dois pontos) e largura (maior extensão perpendicular a esse eixo), em px. */
export function eixosContorno(pontos: readonly Ponto[]): { comprimento: number; largura: number } {
  let maior = 0;
  let ia = 0;
  let ib = 0;
  for (let i = 0; i < pontos.length; i += 1) {
    for (let j = i + 1; j < pontos.length; j += 1) {
      const d = distancia(pontos[i], pontos[j]);
      if (d > maior) {
        maior = d;
        ia = i;
        ib = j;
      }
    }
  }
  if (maior === 0) return { comprimento: 0, largura: 0 };
  const a = pontos[ia];
  const b = pontos[ib];
  // Normal unitária ao eixo do comprimento.
  const nx = -(b.y - a.y) / maior;
  const ny = (b.x - a.x) / maior;
  let min = Infinity;
  let max = -Infinity;
  for (const p of pontos) {
    const proj = (p.x - a.x) * nx + (p.y - a.y) * ny;
    if (proj < min) min = proj;
    if (proj > max) max = proj;
  }
  return { comprimento: maior, largura: max - min };
}

const arred2 = (v: number) => Math.round(v * 100) / 100;

/** Erros de calibração (lista vazia = válida). */
export function errosCalibracao(c: unknown): string[] {
  if (typeof c !== 'object' || c === null) return [ERROS_MEDICAO.pontoInvalido];
  const { p1, p2, distanciaCm } = c as Record<string, unknown>;
  const erros: string[] = [];
  if (!pontoValido(p1) || !pontoValido(p2)) erros.push(ERROS_MEDICAO.pontoInvalido);
  else if (distancia(p1, p2) === 0) erros.push(ERROS_MEDICAO.calibracaoCoincidente);
  if (typeof distanciaCm !== 'number' || !Number.isFinite(distanciaCm) || distanciaCm <= 0) erros.push(ERROS_MEDICAO.calibracaoDistancia);
  return erros;
}

/** Erros do contorno (lista vazia = válido). */
export function errosContorno(contorno: unknown): string[] {
  if (!Array.isArray(contorno)) return [ERROS_MEDICAO.contornoPoucosPontos];
  if (contorno.length < 3) return [ERROS_MEDICAO.contornoPoucosPontos];
  if (contorno.length > MAX_PONTOS_CONTORNO) return [ERROS_MEDICAO.contornoPontosDemais];
  if (!contorno.every(pontoValido)) return [ERROS_MEDICAO.pontoInvalido];
  const pts = contorno as Ponto[];
  const chaves = new Set(pts.map((p) => `${p.x},${p.y}`));
  if (chaves.size !== pts.length) return [ERROS_MEDICAO.contornoPontoRepetido];
  if (temAutointersecao(pts)) return [ERROS_MEDICAO.contornoAutointersecao];
  if (areaPoligono(pts) === 0) return [ERROS_MEDICAO.contornoDegenerado];
  return [];
}

/**
 * Calcula a medição a partir da calibração e do contorno. Lança Error com a mensagem do primeiro problema (a API
 * converte em 400). Resultado em cm e cm², 2 casas.
 */
export function calcularMedicaoFoto(calibracao: CalibracaoFoto, contorno: readonly Ponto[]): ResultadoMedicaoFoto {
  const erros = [...errosCalibracao(calibracao), ...errosContorno(contorno)];
  if (erros.length > 0) throw new Error(erros[0]);
  const cmPorPx = calibracao.distanciaCm / distancia(calibracao.p1, calibracao.p2);
  const { comprimento, largura } = eixosContorno(contorno);
  return {
    areaCm2: arred2(areaPoligono(contorno) * cmPorPx * cmPorPx),
    comprimentoCm: arred2(comprimento * cmPorPx),
    larguraCm: arred2(largura * cmPorPx),
  };
}
