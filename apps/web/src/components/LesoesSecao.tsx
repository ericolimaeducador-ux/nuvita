import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  AVISOS_FERIDA,
  ETIOLOGIAS_LESAO,
  LADOS_LESAO,
  SUBTIPOS_LESAO_UMIDADE,
  validarIdentificacaoLesao,
  type IdentificacaoLesao,
  type PontoMedida,
} from '@shared/consulta';
import { ErroConsulta } from '@/components/ErroConsulta';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { apiErrorMessage } from '@/api/client';
import { consentimentoImagemApi, lesoesApi } from '@/api/resources';
import { ROTULO_FERIDA, descreverLesao } from '@/components/consulta/ModuloFerida';
import { fmt } from '@/components/consulta/MedicaoFoto';
import type { HistoricoLesao, Lesao } from '@/types';

/**
 * Lesões do paciente (etapa 5c), SOMENTE LEITURA do histórico: lesões abertas primeiro, cada uma com a linha do tempo das
 * avaliações feitas em consultas ASSINADAS e um gráfico simples das medidas com o método de cada ponto (manual x foto).
 * Inclui o consentimento de imagem (necessário para fotos novas) e a correção versionada da identificação da lesão.
 * Visível só para ENFERMEIRO.
 */

const r = (v: string) => ROTULO_FERIDA[v] ?? v;
// TODO(legal): texto do termo de consentimento de uso de imagem — a definir pelo jurídico.
const TEXTO_TERMO_IMAGEM = 'Texto do termo de consentimento de uso de imagem: a definir (TODO legal).';

function ConsentimentoImagemBloco({ pacienteId }: { pacienteId: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['consentimento-imagem', pacienteId], queryFn: () => consentimentoImagemApi.get(pacienteId) });
  const [obtidoEm, setObtidoEm] = useState('');
  const invalidar = () => void qc.invalidateQueries({ queryKey: ['consentimento-imagem', pacienteId] });
  const registrar = useMutation({
    mutationFn: () => consentimentoImagemApi.registrar(pacienteId, new Date(obtidoEm).toISOString()),
    onSuccess: () => { invalidar(); setObtidoEm(''); toast.success('Consentimento de imagem registrado.'); },
    onError: (e) => toast.error('Erro ao registrar o consentimento', apiErrorMessage(e)),
  });
  const revogar = useMutation({
    mutationFn: (id: string) => consentimentoImagemApi.revogar(id),
    onSuccess: () => { invalidar(); toast.success('Consentimento revogado. Fotos já registradas continuam no prontuário.'); },
    onError: (e) => toast.error('Erro ao revogar o consentimento', apiErrorMessage(e)),
  });
  if (q.isLoading) return <Skeleton className="h-12 w-full" />;
  if (q.isError) return <ErroConsulta erro={q.error} refetch={q.refetch} recurso="o consentimento de imagem" />;
  const vigente = q.data?.vigente;
  return (
    <div className="space-y-2 rounded-lg border border-border p-3" aria-label="Consentimento de imagem">
      <div className="text-sm font-medium">Consentimento de uso de imagem</div>
      <p className="text-xs text-muted-foreground">{TEXTO_TERMO_IMAGEM}</p>
      {vigente ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">Vigente</Badge>
          <span>obtido em {dayjs(vigente.obtidoEm).format('DD/MM/YYYY HH:mm')}</span>
          <Button size="sm" variant="outline" disabled={revogar.isPending} onClick={() => revogar.mutate(vigente.id)}>Revogar</Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <Badge variant="outline">Sem consentimento vigente — fotos novas bloqueadas</Badge>
          <div className="space-y-1">
            <Label htmlFor="cons-obtido">Obtido em</Label>
            <Input id="cons-obtido" type="datetime-local" value={obtidoEm} onChange={(e) => setObtidoEm(e.target.value)} />
          </div>
          <Button size="sm" disabled={!obtidoEm || registrar.isPending} onClick={() => registrar.mutate()}>Registrar consentimento</Button>
        </div>
      )}
    </div>
  );
}

// ---------------- gráfico simples (SVG) ----------------

interface PontoSerie { data: string; valor: number; metodo: PontoMedida['metodo'] }

/** Marcador por método: círculo = manual, quadrado = foto (identidade nunca só por cor). */
function Marcador({ x, y, metodo, titulo }: { x: number; y: number; metodo: PontoMedida['metodo']; titulo: string }) {
  return (
    <g>
      <title>{titulo}</title>
      {metodo === 'MANUAL'
        ? <circle cx={x} cy={y} r={5} className="fill-card stroke-primary" strokeWidth={2} />
        : <rect x={x - 5} y={y - 5} width={10} height={10} rx={1} className="fill-primary stroke-card" strokeWidth={2} />}
      <circle cx={x} cy={y} r={12} fill="transparent" />
    </g>
  );
}

function GraficoMedida({ titulo, unidade, pontos }: { titulo: string; unidade: string; pontos: PontoSerie[] }) {
  if (pontos.length === 0) return null;
  const L = 320; const A = 120; const m = { e: 40, d: 12, t: 10, b: 22 };
  const datas = [...new Set(pontos.map((p) => p.data))];
  const max = Math.max(...pontos.map((p) => p.valor)) || 1;
  const x = (d: string) => m.e + (datas.length === 1 ? (L - m.e - m.d) / 2 : (datas.indexOf(d) * (L - m.e - m.d)) / (datas.length - 1));
  const y = (v: number) => m.t + (A - m.t - m.b) * (1 - v / max);
  const linha = (metodo: PontoMedida['metodo']) => pontos.filter((p) => p.metodo === metodo).map((p) => `${x(p.data)},${y(p.valor)}`).join(' ');
  return (
    <figure className="space-y-1">
      <figcaption className="text-xs font-medium text-muted-foreground">{titulo} ({unidade})</figcaption>
      <svg viewBox={`0 0 ${L} ${A}`} className="w-full max-w-md text-muted-foreground" role="img" aria-label={`${titulo} ao longo do tempo`}>
        <line x1={m.e} y1={A - m.b} x2={L - m.d} y2={A - m.b} className="stroke-border" />
        <text x={m.e - 6} y={y(max) + 4} textAnchor="end" className="fill-current text-[10px]">{fmt(max)}</text>
        <text x={m.e - 6} y={A - m.b} textAnchor="end" className="fill-current text-[10px]">0</text>
        {(['MANUAL', 'FOTO'] as const).map((met) => (
          <polyline key={met} points={linha(met)} fill="none" className="stroke-primary" strokeWidth={2} strokeDasharray={met === 'FOTO' ? '4 3' : undefined} />
        ))}
        {datas.map((d) => <text key={d} x={x(d)} y={A - 6} textAnchor="middle" className="fill-current text-[10px]">{dayjs(d).format('DD/MM')}</text>)}
        {pontos.map((p, i) => (
          <Marcador key={i} x={x(p.data)} y={y(p.valor)} metodo={p.metodo}
            titulo={`${dayjs(p.data).format('DD/MM/YYYY')}: ${fmt(p.valor)} ${unidade} — ${p.metodo === 'MANUAL' ? 'manual' : `foto (${AVISOS_FERIDA.estimativaImagem})`}`} />
        ))}
      </svg>
    </figure>
  );
}

function Legenda() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1"><svg width="12" height="12"><circle cx="6" cy="6" r="4" className="fill-card stroke-primary" strokeWidth={2} /></svg> Manual (linha contínua)</span>
      <span className="flex items-center gap-1"><svg width="12" height="12"><rect x="2" y="2" width="8" height="8" className="fill-primary" /></svg> Foto — {AVISOS_FERIDA.estimativaImagem} (linha tracejada)</span>
    </div>
  );
}

// ---------------- correção versionada ----------------

function CorrigirLesaoForm({ lesao, pacienteId, onFechar }: { lesao: Lesao; pacienteId: string; onFechar: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<IdentificacaoLesao>({
    localizacaoAnatomica: lesao.localizacaoAnatomica, lado: lesao.lado, etiologia: lesao.etiologia,
    ...(lesao.subtipoUmidade ? { subtipoUmidade: lesao.subtipoUmidade } : {}),
    ...(lesao.etiologiaOutra ? { etiologiaOutra: lesao.etiologiaOutra } : {}),
  });
  const [motivo, setMotivo] = useState('');
  const salvar = useMutation({
    mutationFn: () => lesoesApi.corrigir(lesao.id, { ...f, motivo, versao: lesao.versao }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['lesoes-historico', pacienteId] }); void qc.invalidateQueries({ queryKey: ['lesoes', pacienteId] }); toast.success('Correção registrada no histórico da lesão.'); onFechar(); },
    onError: (e) => toast.error('Erro ao corrigir a lesão', apiErrorMessage(e)),
  });
  const erros = validarIdentificacaoLesao(f);
  const sel = (rotulo: string, valor: string | undefined, opcoes: readonly string[], on: (v: string) => void) => (
    <div className="space-y-1">
      <Label>{rotulo}</Label>
      <Select value={valor ?? ''} onValueChange={on}>
        <SelectTrigger aria-label={rotulo}><SelectValue /></SelectTrigger>
        <SelectContent>{opcoes.map((o) => <SelectItem key={o} value={o}>{r(o)}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
  return (
    <fieldset className="space-y-2 rounded border border-border p-2" aria-label={`Corrigir lesão ${lesao.numero}`}>
      <legend className="px-1 text-sm font-medium">Corrigir identificação (fica no histórico)</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`corr-loc-${lesao.id}`}>Localização anatômica</Label>
          <Input id={`corr-loc-${lesao.id}`} value={f.localizacaoAnatomica} onChange={(e) => setF({ ...f, localizacaoAnatomica: e.target.value })} />
        </div>
        {sel('Lado', f.lado, LADOS_LESAO, (v) => setF({ ...f, lado: v as IdentificacaoLesao['lado'] }))}
        {sel('Etiologia (protocolo do serviço)', f.etiologia, ETIOLOGIAS_LESAO, (v) => setF({ localizacaoAnatomica: f.localizacaoAnatomica, lado: f.lado, etiologia: v as IdentificacaoLesao['etiologia'] }))}
        {f.etiologia === 'LESAO_UMIDADE' && sel('Subtipo (protocolo do serviço)', f.subtipoUmidade, SUBTIPOS_LESAO_UMIDADE, (v) => setF({ ...f, subtipoUmidade: v as IdentificacaoLesao['subtipoUmidade'] }))}
        {f.etiologia === 'OUTRA' && (
          <div className="space-y-1">
            <Label htmlFor={`corr-outra-${lesao.id}`}>Descreva a etiologia</Label>
            <Input id={`corr-outra-${lesao.id}`} value={f.etiologiaOutra ?? ''} onChange={(e) => setF({ ...f, etiologiaOutra: e.target.value })} />
          </div>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor={`corr-motivo-${lesao.id}`}>Motivo da correção (mínimo de 10 caracteres)</Label>
        <Textarea id={`corr-motivo-${lesao.id}`} rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={erros.length > 0 || motivo.trim().length < 10 || salvar.isPending} onClick={() => salvar.mutate()}>Salvar correção</Button>
        <Button size="sm" variant="ghost" onClick={onFechar}>Cancelar</Button>
      </div>
    </fieldset>
  );
}

// ---------------- lesão ----------------

function LesaoCartao({ item, pacienteId }: { item: HistoricoLesao; pacienteId: string }) {
  const [corrigindo, setCorrigindo] = useState(false);
  const { lesao, avaliacoes } = item;
  const comprimento: PontoSerie[] = [];
  const area: PontoSerie[] = [];
  for (const a of avaliacoes) {
    for (const p of a.medidas) {
      if (p.comprimentoCm !== undefined) comprimento.push({ data: a.assinadaEm, valor: p.comprimentoCm, metodo: p.metodo });
      if (p.metodo === 'FOTO') area.push({ data: a.assinadaEm, valor: p.areaCm2, metodo: p.metodo });
    }
  }
  return (
    <li className="space-y-2 rounded-lg border border-border p-3" data-testid={`lesao-${lesao.numero}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex-1 font-medium">{descreverLesao(lesao)}</span>
        <Badge variant={lesao.status === 'ABERTA' ? 'default' : 'secondary'}>{r(lesao.status)}</Badge>
        {!corrigindo && <Button size="sm" variant="ghost" onClick={() => setCorrigindo(true)}>Corrigir</Button>}
      </div>
      <p className="text-xs text-muted-foreground">
        Identificada em {dayjs(lesao.dataIdentificacao).format('DD/MM/YYYY')}
        {lesao.subtipoUmidade && ` · ${r(lesao.subtipoUmidade)}`}
        {lesao.motivoEncerramento && ` · Motivo do encerramento: ${lesao.motivoEncerramento}`}
      </p>
      {corrigindo && <CorrigirLesaoForm lesao={lesao} pacienteId={pacienteId} onFechar={() => setCorrigindo(false)} />}
      {lesao.correcoes.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer">Correções ({lesao.correcoes.length})</summary>
          <ul className="mt-1 space-y-1">
            {lesao.correcoes.map((c, i) => (
              <li key={i}>{dayjs(c.em).format('DD/MM/YYYY HH:mm')} — antes: {c.anterior.localizacaoAnatomica} · {r(c.anterior.etiologia)} — motivo: {c.motivo}</li>
            ))}
          </ul>
        </details>
      )}
      {avaliacoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma avaliação em consulta assinada.</p>
      ) : (
        <>
          {(comprimento.length > 0 || area.length > 0) && (
            <div className="space-y-2">
              <Legenda />
              <div className="grid gap-3 md:grid-cols-2">
                <GraficoMedida titulo="Comprimento" unidade="cm" pontos={comprimento} />
                <GraficoMedida titulo="Área (só foto)" unidade="cm²" pontos={area} />
              </div>
            </div>
          )}
          <ol className="space-y-1 text-sm" aria-label={`Linha do tempo da lesão ${lesao.numero}`}>
            {avaliacoes.map((a) => (
              <li key={a.consultaId} className="rounded border border-border p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{dayjs(a.assinadaEm).format('DD/MM/YYYY')}</span>
                  {a.avaliacao.desfecho?.situacao && <Badge variant="outline">{r(a.avaliacao.desfecho.situacao)}</Badge>}
                  <div className="flex-1" />
                  <Link className="text-xs hover:underline" to={`/pacientes/${pacienteId}/consultas/${a.consultaId}`}>Abrir consulta</Link>
                </div>
                {a.medidas.length === 0 ? <p className="text-xs text-muted-foreground">Sem medidas.</p> : (
                  <ul className="text-xs">
                    {a.medidas.map((p, i) => (
                      <li key={i}>
                        {p.metodo === 'MANUAL'
                          ? `Manual: comprimento ${fmt(p.comprimentoCm)} cm · largura ${fmt(p.larguraCm)} cm · profundidade ${fmt(p.profundidadeCm)} cm`
                          : `Foto (${AVISOS_FERIDA.estimativaImagem}): área ${fmt(p.areaCm2)} cm² · comprimento ${fmt(p.comprimentoCm)} cm · largura ${fmt(p.larguraCm)} cm`}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </li>
  );
}

export function LesoesSecao({ pacienteId }: { pacienteId: string }) {
  const q = useQuery({ queryKey: ['lesoes-historico', pacienteId], queryFn: () => lesoesApi.historico(pacienteId) });
  const itens = q.data ?? [];
  return (
    <section aria-label="Lesões" className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 p-4">
        <span className="font-semibold text-foreground">Lesões</span>
        {!q.isError && <Badge variant="secondary">{itens.length}</Badge>}
      </div>
      <div className="space-y-3 px-4 pb-4">
        <ConsentimentoImagemBloco pacienteId={pacienteId} />
        {q.isLoading ? <Skeleton className="h-16 w-full" /> : q.isError ? (
          <ErroConsulta erro={q.error} refetch={q.refetch} recurso="as lesões" />
        ) : itens.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma lesão cadastrada. Cadastre pela consulta de enfermagem (módulo Feridas).</p>
        ) : (
          <ul className="space-y-2">{itens.map((it) => <LesaoCartao key={it.lesao.id} item={it} pacienteId={pacienteId} />)}</ul>
        )}
      </div>
    </section>
  );
}
