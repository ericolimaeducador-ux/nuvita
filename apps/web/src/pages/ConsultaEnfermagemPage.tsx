import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { AlertTriangle, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { ErroConsulta } from '@/components/ErroConsulta';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { apiErrorMessage } from '@/api/client';
import { cobrancasApi, consultasApi, pacientesApi, type ConteudoConsultaPayload } from '@/api/resources';
import { ModulosAvaliacao, type ModuloForm } from '@/components/consulta/ModulosAvaliacao';
import { useAuth } from '@/auth/AuthContext';
import { centavosParaInput, reaisParaCentavos } from '@/lib/dinheiro';
import { formatBRL } from '@/utils';
import {
  PADRAO_IMPLEMENTACAO_LABEL, PadraoImplementacao, STATUS_COBRANCA_CONSULTA_LABEL, StatusCobrancaConsulta, StatusConsulta,
  type ConsultaEnfermagem,
} from '@/types';

/**
 * Consulta de enfermagem em 5 etapas (Res. Cofen 736/2024): Avaliação, Diagnóstico, Planejamento, Implementação e Evolução.
 * Todo o conteúdo é texto do enfermeiro — o sistema não oferece lista de diagnósticos, escala nem taxonomia.
 * Só o enfermeiro autor edita o rascunho, assina e faz adendo; os demais enfermeiros da clínica só leem.
 * Depois de assinada, a consulta fica travada (escolha do projeto); correções só por adendo.
 * TODO(conteudo): rótulos e orientações de cada etapa; módulos da Avaliação entram nas etapas 5b–5d.
 */

export const ETAPAS = ['Avaliação', 'Diagnóstico', 'Planejamento', 'Implementação', 'Evolução'] as const;

interface FormConsulta {
  dadosSubjetivos: string;
  dadosObjetivos: string;
  modulos: ModuloForm[];
  diagnosticos: string[];
  prioridades: string;
  resultadosEsperados: string;
  prescricao: string[];
  examesSolicitados: string;
  encaminhamentos: string;
  registros: Array<{ padrao: PadraoImplementacao; descricao: string; registradoEm?: string }>;
  evolucao: string;
}

function doServidor(c: ConsultaEnfermagem): FormConsulta {
  return {
    dadosSubjetivos: c.avaliacao.dadosSubjetivos ?? '',
    dadosObjetivos: c.avaliacao.dadosObjetivos ?? '',
    modulos: (c.avaliacao.modulos ?? []).map((m) => ({ area: m.area as unknown as ModuloForm['area'], dados: m.dados ?? {} })),
    diagnosticos: c.diagnosticos.map((d) => d.texto),
    prioridades: c.planejamento.prioridades ?? '',
    resultadosEsperados: c.planejamento.resultadosEsperados ?? '',
    prescricao: [...(c.planejamento.prescricaoEnfermagem ?? [])],
    examesSolicitados: c.planejamento.examesSolicitados ?? '',
    encaminhamentos: c.planejamento.encaminhamentos ?? '',
    registros: c.implementacao.registros.map((r) => ({ padrao: r.padrao, descricao: r.descricao, registradoEm: r.registradoEm })),
    evolucao: c.evolucao.texto ?? '',
  };
}

/** Remove chaves undefined/strings vazias antes de enviar (a API recusa tipos errados, não campos ausentes). */
function limpar(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(limpar);
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) if (x !== undefined && x !== '') o[k] = limpar(x);
    return o;
  }
  return v;
}

export function paraPayload(f: FormConsulta): ConteudoConsultaPayload {
  return {
    avaliacao: { dadosSubjetivos: f.dadosSubjetivos, dadosObjetivos: f.dadosObjetivos, modulos: f.modulos.map((m) => ({ area: m.area, dados: limpar(m.dados) })) },
    diagnosticos: f.diagnosticos.map((t) => t.trim()).filter(Boolean).map((texto) => ({ texto, origem: 'MANUAL' as const })),
    planejamento: {
      prioridades: f.prioridades,
      resultadosEsperados: f.resultadosEsperados,
      prescricaoEnfermagem: f.prescricao.map((p) => p.trim()).filter(Boolean),
      examesSolicitados: f.examesSolicitados,
      encaminhamentos: f.encaminhamentos,
    },
    implementacao: {
      registros: f.registros
        .filter((r) => r.descricao.trim())
        .map((r) => ({ padrao: r.padrao, descricao: r.descricao.trim(), ...(r.registradoEm ? { registradoEm: r.registradoEm } : {}) })),
    },
    evolucao: { texto: f.evolucao },
  };
}

function ListaTextos({
  rotulo, itens, editavel, onChange, rotuloNovo,
}: { rotulo: string; itens: string[]; editavel: boolean; onChange: (v: string[]) => void; rotuloNovo: string }) {
  return (
    <div className="space-y-2">
      <Label>{rotulo}</Label>
      {itens.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item.</p>}
      {itens.map((texto, i) => (
        <div key={i} className="flex gap-2">
          <Textarea
            aria-label={`${rotulo} ${i + 1}`}
            rows={2}
            readOnly={!editavel}
            value={texto}
            onChange={(e) => onChange(itens.map((x, k) => (k === i ? e.target.value : x)))}
          />
          {editavel && (
            <Button type="button" variant="ghost" size="icon" aria-label={`Remover ${rotulo} ${i + 1}`} onClick={() => onChange(itens.filter((_, k) => k !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
      {editavel && (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...itens, ''])}>
          <Plus className="mr-2 h-4 w-4" /> {rotuloNovo}
        </Button>
      )}
    </div>
  );
}

function CampoTexto({ id, rotulo, valor, editavel, onChange, rows = 4 }: { id: string; rotulo: string; valor: string; editavel: boolean; onChange: (v: string) => void; rows?: number }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <Textarea id={id} rows={rows} readOnly={!editavel} value={valor} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function ConsultaEnfermagemPage() {
  const { id: pacienteId = '', consultaId = '' } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [etapa, setEtapa] = useState(0);
  const [form, setForm] = useState<FormConsulta | null>(null);
  const [assinando, setAssinando] = useState(false);
  const [pacote, setPacote] = useState(false);
  const [valor, setValor] = useState('');
  const [adendoAberto, setAdendoAberto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [textoAdendo, setTextoAdendo] = useState('');

  const consultaQ = useQuery({ queryKey: ['consulta', consultaId], queryFn: () => consultasApi.get(consultaId), enabled: !!consultaId });
  const configQ = useQuery({ queryKey: ['cobrancas-config'], queryFn: () => cobrancasApi.config(), enabled: assinando });
  const consulta = consultaQ.data;
  const pacienteQ = useQuery({ queryKey: ['paciente', pacienteId], queryFn: () => pacientesApi.get(pacienteId), enabled: !!pacienteId });

  useEffect(() => { if (consulta) setForm(doServidor(consulta)); }, [consulta]);
  useEffect(() => { if (configQ.data) setValor(centavosParaInput(configQ.data.valorConsultaCentavos)); }, [configQ.data]);

  const ehAutor = !!consulta && consulta.enfermeiroId === user?.id;
  const assinada = consulta?.status === StatusConsulta.ASSINADA;
  const editavel = !!consulta && ehAutor && !assinada;
  const set = <K extends keyof FormConsulta>(k: K, v: FormConsulta[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const revalidar = () => {
    void qc.invalidateQueries({ queryKey: ['consulta', consultaId] });
    void qc.invalidateQueries({ queryKey: ['consultas', pacienteId] });
    void qc.invalidateQueries({ queryKey: ['cobrancas', pacienteId] });
  };

  const salvarMut = useMutation({
    mutationFn: () => consultasApi.salvarRascunho(consultaId, paraPayload(form!)),
    onSuccess: () => { toast.success('Rascunho salvo.'); revalidar(); },
    onError: (e) => toast.error('Erro ao salvar o rascunho', apiErrorMessage(e)),
  });
  const valorCentavos = reaisParaCentavos(valor);
  const assinarMut = useMutation({
    mutationFn: async () => {
      await consultasApi.salvarRascunho(consultaId, paraPayload(form!));
      return consultasApi.assinar(consultaId, pacote ? { incluidaEmPacote: true } : { incluidaEmPacote: false, valorCentavos });
    },
    onSuccess: (c) => {
      setAssinando(false);
      if (c.cobranca?.status === StatusCobrancaConsulta.PENDENTE_GERACAO) toast.error('Consulta assinada, mas a cobrança ficou pendente', 'Use "Gerar cobrança".');
      else toast.success('Consulta assinada.');
      revalidar();
    },
    onError: (e) => toast.error('Erro ao assinar', apiErrorMessage(e)),
  });
  const gerarMut = useMutation({
    mutationFn: () => consultasApi.gerarCobranca(consultaId),
    onSuccess: () => { toast.success('Cobrança gerada.'); revalidar(); },
    onError: (e) => toast.error('Erro ao gerar a cobrança', apiErrorMessage(e)),
  });
  const adendoMut = useMutation({
    mutationFn: () => consultasApi.criarAdendo(consultaId, motivo.trim(), textoAdendo),
    onSuccess: () => { toast.success('Adendo registrado.'); setAdendoAberto(false); setMotivo(''); setTextoAdendo(''); revalidar(); },
    onError: (e) => toast.error('Erro ao registrar o adendo', apiErrorMessage(e)),
  });

  if (consultaQ.isLoading || (consulta && !form)) return <div className="p-6"><Skeleton className="h-64 w-full" /></div>;
  if (consultaQ.isError || !consulta || !form) {
    return <div className="p-6"><ErroConsulta erro={consultaQ.error} refetch={consultaQ.refetch} recurso="a consulta" /></div>;
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Consulta de enfermagem"
        description={assinada ? 'Consulta assinada: somente leitura. Correções por adendo.' : ehAutor ? 'Rascunho: preencha as etapas e assine ao final.' : 'Rascunho de outro enfermeiro: somente leitura.'}
        extra={
          <Button asChild variant="outline">
            <Link to={`/pacientes/${pacienteId}`}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao paciente</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={assinada ? 'secondary' : 'outline'}>{assinada ? 'Assinada' : 'Rascunho'}</Badge>
        {assinada && consulta.assinatura && (
          <span className="text-sm text-muted-foreground">
            Assinada em {dayjs(consulta.assinatura.dataAssinatura).format('DD/MM/YYYY HH:mm')} · COREN {consulta.assinatura.coren}
          </span>
        )}
        {consulta.cobranca && (
          <Badge variant="outline">
            {STATUS_COBRANCA_CONSULTA_LABEL[consulta.cobranca.status]}
            {consulta.cobranca.valorCentavos !== undefined ? ` · ${formatBRL(consulta.cobranca.valorCentavos / 100)}` : ''}
          </Badge>
        )}
      </div>

      {consulta.cobranca?.status === StatusCobrancaConsulta.PENDENTE_GERACAO && (
        <div role="alert" className="flex items-center gap-3 rounded-lg border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">A consulta foi assinada, mas a cobrança ainda não foi gerada.</span>
          {ehAutor && (
            <Button size="sm" onClick={() => gerarMut.mutate()} disabled={gerarMut.isPending}>
              {gerarMut.isPending ? 'Gerando…' : 'Gerar cobrança'}
            </Button>
          )}
        </div>
      )}

      {/* Stepper das 5 etapas */}
      <nav aria-label="Etapas da consulta" className="flex flex-wrap gap-2">
        {ETAPAS.map((nome, i) => (
          <Button key={nome} type="button" size="sm" variant={i === etapa ? 'default' : 'outline'} aria-current={i === etapa ? 'step' : undefined} onClick={() => setEtapa(i)}>
            {i + 1}. {nome}
          </Button>
        ))}
      </nav>

      <section aria-label={`Etapa ${etapa + 1}: ${ETAPAS[etapa]}`}className="space-y-4 rounded-xl border border-border bg-card p-4">
        {etapa === 0 && (
          <>
            <CampoTexto id="cSubj" rotulo="Dados subjetivos (entrevista)" valor={form.dadosSubjetivos} editavel={editavel} onChange={(v) => set('dadosSubjetivos', v)} rows={6} />
            <CampoTexto id="cObj" rotulo="Dados objetivos (exame físico)" valor={form.dadosObjetivos} editavel={editavel} onChange={(v) => set('dadosObjetivos', v)} rows={6} />
            <ModulosAvaliacao
              consultaId={consultaId}
              modulos={form.modulos}
              editavel={editavel}
              classificacoes={(pacienteQ.data?.classificacoes ?? []) as string[]}
              onChange={(m) => set('modulos', m)}
            />
          </>
        )}
        {etapa === 1 && (
          <ListaTextos rotulo="Diagnóstico de enfermagem" rotuloNovo="Adicionar diagnóstico" itens={form.diagnosticos} editavel={editavel} onChange={(v) => set('diagnosticos', v)} />
        )}
        {etapa === 2 && (
          <>
            <CampoTexto id="cPrior" rotulo="Prioridades" valor={form.prioridades} editavel={editavel} onChange={(v) => set('prioridades', v)} />
            <CampoTexto id="cRes" rotulo="Resultados esperados" valor={form.resultadosEsperados} editavel={editavel} onChange={(v) => set('resultadosEsperados', v)} />
            <ListaTextos rotulo="Prescrição de enfermagem" rotuloNovo="Adicionar item" itens={form.prescricao} editavel={editavel} onChange={(v) => set('prescricao', v)} />
            <CampoTexto id="cExames" rotulo="Exames solicitados" valor={form.examesSolicitados} editavel={editavel} onChange={(v) => set('examesSolicitados', v)} rows={3} />
            <CampoTexto id="cEnc" rotulo="Encaminhamentos" valor={form.encaminhamentos} editavel={editavel} onChange={(v) => set('encaminhamentos', v)} rows={3} />
          </>
        )}
        {etapa === 3 && (
          <div className="space-y-3">
            <Label>Registros da implementação</Label>
            {form.registros.length === 0 && <p className="text-sm text-muted-foreground">Nenhum registro.</p>}
            {form.registros.map((r, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[12rem_1fr_auto]">
                <Select
                  value={r.padrao}
                  disabled={!editavel}
                  onValueChange={(v) => set('registros', form.registros.map((x, k) => (k === i ? { ...x, padrao: v as PadraoImplementacao } : x)))}
                >
                  <SelectTrigger aria-label={`Padrão do registro ${i + 1}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(PadraoImplementacao).map((p) => <SelectItem key={p} value={p}>{PADRAO_IMPLEMENTACAO_LABEL[p]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Textarea
                  aria-label={`Descrição do registro ${i + 1}`}
                  rows={2}
                  readOnly={!editavel}
                  value={r.descricao}
                  onChange={(e) => set('registros', form.registros.map((x, k) => (k === i ? { ...x, descricao: e.target.value } : x)))}
                />
                {editavel && (
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remover registro ${i + 1}`} onClick={() => set('registros', form.registros.filter((_, k) => k !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {editavel && (
              <Button type="button" variant="outline" size="sm" onClick={() => set('registros', [...form.registros, { padrao: PadraoImplementacao.AUTONOMO, descricao: '' }])}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar registro
              </Button>
            )}
          </div>
        )}
        {etapa === 4 && (
          <CampoTexto id="cEvol" rotulo="Evolução" valor={form.evolucao} editavel={editavel} onChange={(v) => set('evolucao', v)} rows={8} />
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="button" variant="outline" disabled={etapa === 0} onClick={() => setEtapa((e) => e - 1)}>Anterior</Button>
          <Button type="button" variant="outline" disabled={etapa === ETAPAS.length - 1} onClick={() => setEtapa((e) => e + 1)}>Próxima</Button>
          <div className="flex-1" />
          {editavel && (
            <>
              <Button type="button" variant="outline" onClick={() => salvarMut.mutate()} disabled={salvarMut.isPending}>
                {salvarMut.isPending ? 'Salvando…' : 'Salvar rascunho'}
              </Button>
              <Button type="button" onClick={() => { setPacote(false); setAssinando(true); }}>Assinar consulta</Button>
            </>
          )}
        </div>
      </section>

      {assinada && (
        <section aria-label="Adendos" className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold">Adendos</span>
            <Badge variant="secondary">{consulta.adendos.length}</Badge>
            <div className="flex-1" />
            {ehAutor && (
              <Button size="sm" variant="outline" onClick={() => setAdendoAberto(true)}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar adendo
              </Button>
            )}
          </div>
          {consulta.adendos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum adendo.</p>
          ) : (
            <ol className="space-y-2">
              {consulta.adendos.map((a) => (
                <li key={a.id} className="rounded-lg border border-border p-3 text-sm">
                  <div className="font-medium">Adendo nº {a.numero} · {dayjs(a.criadoEm).format('DD/MM/YYYY HH:mm')}</div>
                  <div className="text-muted-foreground">Motivo: {a.motivo}</div>
                  <p className="mt-1 whitespace-pre-wrap">{a.texto}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <Dialog open={assinando} onOpenChange={(a) => { if (!a) setAssinando(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assinar consulta</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Depois de assinada, a consulta não pode mais ser alterada; correções só por adendo. A assinatura usa o COREN do seu perfil.
          </p>
          <div className="space-y-3 rounded-lg border border-border p-3">
            <div className="text-sm font-medium">Cobrança da consulta</div>
            <div className="flex items-center gap-2">
              <Checkbox id="cPacote" checked={pacote} onCheckedChange={(c) => setPacote(!!c)} />
              <Label htmlFor="cPacote">Incluída em pacote — não cobrar</Label>
            </div>
            {!pacote && (
              <div className="space-y-1.5">
                <Label htmlFor="cValor">Valor (R$)</Label>
                <Input id="cValor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssinando(false)}>Cancelar</Button>
            <Button disabled={assinarMut.isPending || (!pacote && !Number.isFinite(valorCentavos))} onClick={() => assinarMut.mutate()}>
              {assinarMut.isPending ? 'Assinando…' : 'Assinar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adendoAberto} onOpenChange={(a) => { if (!a) setAdendoAberto(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Adicionar adendo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="adMotivo">Motivo *</Label>
              <Input id="adMotivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Mínimo de 10 caracteres" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adTexto">Texto do adendo *</Label>
              <Textarea id="adTexto" rows={5} value={textoAdendo} onChange={(e) => setTextoAdendo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdendoAberto(false)}>Cancelar</Button>
            <Button disabled={motivo.trim().length < 10 || !textoAdendo.trim() || adendoMut.isPending} onClick={() => adendoMut.mutate()}>
              {adendoMut.isPending ? 'Salvando…' : 'Registrar adendo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
