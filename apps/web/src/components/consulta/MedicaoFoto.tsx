import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AVISOS_FERIDA,
  calcularMedicaoFoto,
  errosCalibracao,
  errosContorno,
  type CalibracaoFoto,
  type Ponto,
} from '@shared/consulta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { consultasApi } from '@/api/resources';

/**
 * Ferramenta de medição sobre a foto (etapa 5c). ZERO IA: nenhuma detecção de contorno, nenhum processamento de imagem.
 * O enfermeiro (a) calibra marcando 2 pontos sobre a régua e digitando a distância real em cm; (b) marca os pontos do
 * contorno (polígono fechado), podendo arrastar ou remover pontos. O cálculo usa a MESMA função da API
 * (@shared/consulta/geometria-ferida) — a API recalcula a partir dos pontos e não confia neste número.
 * Camada de desenho em SVG sobre a foto (mouse e toque via Pointer Events), em coordenadas de pixel da imagem original.
 */

type Modo = 'calibrar' | 'contornar';

/** Medição em edição (pode estar incompleta). Só vai para o módulo quando calibração e contorno são válidos. */
export interface RascunhoMedicao {
  anexoId: string;
  calibracao: { p1?: Ponto; p2?: Ponto; distanciaCm?: number };
  contorno: Ponto[];
}
const RAIO_TOQUE_TELA = 14;

export function MedicaoFoto({
  consultaId, valor, editavel, onChange,
}: { consultaId: string; valor: RascunhoMedicao; editavel: boolean; onChange: (v: RascunhoMedicao) => void }) {
  const urlQ = useQuery({ queryKey: ['consulta-anexo-url', consultaId, valor.anexoId], queryFn: () => consultasApi.urlAnexo(consultaId, valor.anexoId), staleTime: 4 * 60_000 });
  const [dim, setDim] = useState<{ w: number; h: number } | null>(null);
  const [modo, setModo] = useState<Modo>(valor.calibracao?.p1 && valor.calibracao?.p2 ? 'contornar' : 'calibrar');
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const arrastando = useRef<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const cal = valor.calibracao ?? {};
  const contorno = valor.contorno ?? [];
  const atualizar = (parcial: Partial<RascunhoMedicao>) => onChange({ ...valor, ...parcial });

  const paraImagem = (e: ReactPointerEvent): Ponto | null => {
    const svg = svgRef.current;
    if (!svg || !dim) return null;
    const r = svg.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    const x = Math.round(((e.clientX - r.left) * dim.w) / r.width);
    const y = Math.round(((e.clientY - r.top) * dim.h) / r.height);
    return { x: Math.min(Math.max(x, 0), dim.w), y: Math.min(Math.max(y, 0), dim.h) };
  };
  const raioImagem = () => {
    const r = svgRef.current?.getBoundingClientRect();
    return dim && r && r.width > 0 ? (RAIO_TOQUE_TELA * dim.w) / r.width : RAIO_TOQUE_TELA;
  };
  const pontoProximo = (p: Ponto) => {
    const raio = raioImagem();
    const i = contorno.findIndex((q) => Math.hypot(q.x - p.x, q.y - p.y) <= raio);
    return i >= 0 ? i : null;
  };

  const onDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!editavel) return;
    const p = paraImagem(e);
    if (!p) return;
    if (modo === 'calibrar') {
      // 1º clique = p1, 2º = p2; um 3º recomeça.
      if (!cal.p1 || cal.p2) atualizar({ calibracao: { p1: p, distanciaCm: cal.distanciaCm } });
      else atualizar({ calibracao: { ...cal, p2: p } });
      return;
    }
    const i = pontoProximo(p);
    if (i !== null) {
      setSelecionado(i);
      arrastando.current = i;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      return;
    }
    atualizar({ contorno: [...contorno, p] });
    setSelecionado(contorno.length);
  };
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const i = arrastando.current;
    if (i === null || !editavel) return;
    const p = paraImagem(e);
    if (p) atualizar({ contorno: contorno.map((q, j) => (j === i ? p : q)) });
  };
  const onUp = () => { arrastando.current = null; };

  let resultado: ReturnType<typeof calcularMedicaoFoto> | null = null;
  const problemas = [...errosCalibracao(valor.calibracao), ...errosContorno(contorno)];
  if (problemas.length === 0) {
    try { resultado = calcularMedicaoFoto(valor.calibracao as CalibracaoFoto, contorno); } catch { resultado = null; }
  }
  const raio = raioImagem() * 0.5;
  const traco = dim ? Math.max(dim.w, dim.h) / 400 : 2;

  return (
    <div className="space-y-2 rounded border border-border p-2" data-testid="medicao-foto">
      {editavel && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Etapa da medição">
          <Button type="button" size="sm" variant={modo === 'calibrar' ? 'default' : 'outline'} onClick={() => setModo('calibrar')}>1. Calibrar na régua</Button>
          <Button type="button" size="sm" variant={modo === 'contornar' ? 'default' : 'outline'} onClick={() => setModo('contornar')}>2. Contornar a lesão</Button>
          {modo === 'contornar' && (
            <>
              <Button type="button" size="sm" variant="ghost" disabled={selecionado === null}
                onClick={() => { if (selecionado !== null) { atualizar({ contorno: contorno.filter((_, j) => j !== selecionado) }); setSelecionado(null); } }}>
                Remover ponto selecionado
              </Button>
              <Button type="button" size="sm" variant="ghost" disabled={contorno.length === 0} onClick={() => { atualizar({ contorno: [] }); setSelecionado(null); }}>
                Limpar contorno
              </Button>
            </>
          )}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {modo === 'calibrar'
          ? 'Marque dois pontos sobre a régua e informe a distância real entre eles.'
          : 'Toque/clique para adicionar pontos do contorno; arraste um ponto para movê-lo; toque nele para selecioná-lo.'}
      </p>
      {modo === 'calibrar' && (
        <div className="max-w-xs space-y-1">
          <Label htmlFor={`cal-${valor.anexoId}`}>Distância real na régua (cm)</Label>
          <Input id={`cal-${valor.anexoId}`} type="number" min={0} step="0.1" readOnly={!editavel} value={cal.distanciaCm || ''}
            onChange={(e) => atualizar({ calibracao: { ...cal, distanciaCm: e.target.value === '' ? undefined : Number(e.target.value) } })} />
        </div>
      )}
      <div className="relative inline-block max-w-full">
        {urlQ.data?.accessUrl ? (
          <img src={urlQ.data.accessUrl} alt="Foto da lesão" className="block max-h-[480px] max-w-full select-none" draggable={false}
            onLoad={(e) => setDim({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} />
        ) : (
          <div className="flex h-40 w-64 items-center justify-center text-sm text-muted-foreground">{urlQ.isError ? 'Não foi possível abrir a foto.' : 'Carregando foto…'}</div>
        )}
        {dim && (
          <svg ref={svgRef} aria-label="Camada de medição" viewBox={`0 0 ${dim.w} ${dim.h}`} preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full" style={{ touchAction: 'none', cursor: editavel ? 'crosshair' : 'default' }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            {cal.p1 && cal.p2 && <line x1={cal.p1.x} y1={cal.p1.y} x2={cal.p2.x} y2={cal.p2.y} stroke="#f59e0b" strokeWidth={traco} strokeDasharray={`${traco * 3} ${traco * 2}`} />}
            {[cal.p1, cal.p2].filter(Boolean).map((p, i) => <circle key={`c${i}`} cx={p!.x} cy={p!.y} r={raio} fill="#f59e0b" stroke="#fff" strokeWidth={traco / 2} />)}
            {contorno.length > 1 && (
              <polygon points={contorno.map((p) => `${p.x},${p.y}`).join(' ')} fill="rgba(14,165,233,0.15)" stroke="#0ea5e9" strokeWidth={traco} />
            )}
            {contorno.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={raio} fill={i === selecionado ? '#ef4444' : '#0ea5e9'} stroke="#fff" strokeWidth={traco / 2} />
            ))}
          </svg>
        )}
      </div>
      <div className="text-sm" aria-live="polite">
        {resultado ? (
          <p>
            <span className="font-medium">Foto ({AVISOS_FERIDA.estimativaImagem}):</span>{' '}
            área {fmt(resultado.areaCm2)} cm² · comprimento {fmt(resultado.comprimentoCm)} cm · largura {fmt(resultado.larguraCm)} cm
          </p>
        ) : (
          <p className="text-muted-foreground">{problemas[0] ?? 'Complete a calibração e o contorno.'}</p>
        )}
      </div>
    </div>
  );
}

export const fmt = (v: number | undefined) => (v === undefined ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }));

/** Medição completa e válida -> entra no módulo; senão, null (fica só no rascunho da tela). */
export function medicaoValida(r: RascunhoMedicao): { anexoId: string; calibracao: CalibracaoFoto; contorno: Ponto[] } | null {
  if (errosCalibracao(r.calibracao).length > 0 || errosContorno(r.contorno).length > 0) return null;
  return { anexoId: r.anexoId, calibracao: r.calibracao as CalibracaoFoto, contorno: r.contorno };
}
