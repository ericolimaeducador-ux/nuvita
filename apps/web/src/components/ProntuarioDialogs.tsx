import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { PenLine } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { prontuariosApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/auth/AuthContext';
import {
  TipoAtendimento, TIPO_ATENDIMENTO_LABEL,
  LocalAtendimento, LOCAL_LABEL, PerfilCliente, PERFIL_LABEL, Destreza, DESTREZA_LABEL,
  TipoIU, TIPO_IU_LABEL, EncaminhamentoIU, ENCAMINHAMENTO_LABEL,
  type Prontuario, type FichaVaPro,
} from '@/types';

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground mt-0.5 whitespace-pre-line">{children || '—'}</p>
    </div>
  );
}

function SecaoSOAP({ letra, titulo, children }: { letra: string; titulo: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">{letra} — {titulo}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/** Visualização (somente leitura) de um prontuário SOAP, com ação de assinar rascunho. */
export function ProntuarioDetailDialog({
  prontuarioId,
  open,
  onOpenChange,
}: {
  prontuarioId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['prontuario', prontuarioId],
    queryFn: () => prontuariosApi.get(prontuarioId!),
    enabled: !!prontuarioId && open,
  });
  const assinarMut = useMutation({
    mutationFn: () => prontuariosApi.assinar(prontuarioId!),
    onSuccess: () => {
      toast.success('Prontuário assinado.');
      void qc.invalidateQueries({ queryKey: ['prontuario', prontuarioId] });
      void qc.invalidateQueries({ queryKey: ['prontuarios'] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const pr = q.data as Prontuario | undefined;
  const sv = pr?.objetivo?.sinaisVitais;
  const sinais = sv
    ? [
        sv.pressaoArterial && `PA ${sv.pressaoArterial}`,
        sv.frequenciaCardiaca && `FC ${sv.frequenciaCardiaca} bpm`,
        sv.frequenciaRespiratoria && `FR ${sv.frequenciaRespiratoria} irpm`,
        sv.temperatura && `Tax ${sv.temperatura} °C`,
        sv.saturacaoO2 && `SatO₂ ${sv.saturacaoO2}%`,
        sv.peso && `Peso ${sv.peso} kg`,
        sv.altura && `Altura ${sv.altura} cm`,
      ].filter(Boolean).join('  ·  ')
    : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Prontuário
            {pr && <Badge variant={pr.assinado ? 'success' : 'warning'}>{pr.assinado ? 'Assinado' : 'Rascunho'}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {q.isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : !pr ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Não foi possível carregar o prontuário.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 glass rounded-xl p-4">
              <Campo label="Data do atendimento">{pr.dataAtendimento ? dayjs(pr.dataAtendimento).format('DD/MM/YYYY HH:mm') : '—'}</Campo>
              <Campo label="Tipo">{TIPO_ATENDIMENTO_LABEL[pr.tipo] ?? pr.tipo}</Campo>
              {pr.assinado?.dataAssinatura && (
                <Campo label="Assinado em">{dayjs(pr.assinado.dataAssinatura).format('DD/MM/YYYY HH:mm')}</Campo>
              )}
            </div>

            <SecaoSOAP letra="S" titulo="Subjetivo">
              <Campo label="Queixa principal">{pr.subjetivo?.queixaPrincipal}</Campo>
              <Campo label="História da doença atual">{pr.subjetivo?.hda}</Campo>
            </SecaoSOAP>

            <SecaoSOAP letra="O" titulo="Objetivo">
              <Campo label="Exame físico">{pr.objetivo?.exameFisico}</Campo>
              <Campo label="Sinais vitais">{sinais}</Campo>
            </SecaoSOAP>

            <SecaoSOAP letra="A" titulo="Avaliação">
              <Campo label="Hipóteses diagnósticas">{pr.avaliacao?.hipotesesDiagnosticas?.join(', ')}</Campo>
              <Campo label="CID-10">{pr.avaliacao?.cid10?.join(', ')}</Campo>
            </SecaoSOAP>

            <SecaoSOAP letra="P" titulo="Plano">
              <Campo label="Conduta">{pr.plano?.conduta}</Campo>
              <Campo label="Prescrição">{pr.plano?.prescricao}</Campo>
              <Campo label="Exames solicitados">{pr.plano?.examesSolicitados?.join(', ')}</Campo>
            </SecaoSOAP>

            {pr.fichaVaPro && (
              <div className="glass rounded-xl p-4 border border-primary/20">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                  Ficha VaPro (Hollister) — Avaliação de IU
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Local">{pr.fichaVaPro.local ? LOCAL_LABEL[pr.fichaVaPro.local as LocalAtendimento] : ''}</Campo>
                  <Campo label="Início dos sintomas">{pr.fichaVaPro.inicioSintomas}</Campo>
                  <Campo label="Motivo da IU">{pr.fichaVaPro.motivoIU}</Campo>
                  <Campo label="Perfil do cliente">{pr.fichaVaPro.perfilCliente ? PERFIL_LABEL[pr.fichaVaPro.perfilCliente as PerfilCliente] : ''}</Campo>
                  <Campo label="Destreza">{pr.fichaVaPro.destreza ? DESTREZA_LABEL[pr.fichaVaPro.destreza as Destreza] : ''}</Campo>
                  <Campo label="DNTUI">{pr.fichaVaPro.dntui === undefined ? '' : pr.fichaVaPro.dntui ? 'Sim' : 'Não'}</Campo>
                  <Campo label="Tipos de IU">{(pr.fichaVaPro.tiposIU ?? []).map((t) => TIPO_IU_LABEL[t as TipoIU] ?? t).join(', ')}</Campo>
                  <Campo label="Micção espontânea">{pr.fichaVaPro.miccaoEspontanea === undefined ? '' : pr.fichaVaPro.miccaoEspontanea ? 'Sim' : 'Não'}</Campo>
                  <Campo label="Realiza cateterismo">{pr.fichaVaPro.realizaCateterismo === undefined ? '' : pr.fichaVaPro.realizaCateterismo ? 'Sim' : 'Não'}</Campo>
                  <Campo label="Cateterismos/dia">{pr.fichaVaPro.cateterismosDia}</Campo>
                  <Campo label="Cateter utilizado">{pr.fichaVaPro.cateterUtilizado}</Campo>
                  <Campo label="Última ITU">{pr.fichaVaPro.ultimaInfeccaoUrinaria}</Campo>
                  <Campo label="Em tratamento">{pr.fichaVaPro.emTratamento === undefined ? '' : pr.fichaVaPro.emTratamento ? 'Sim' : 'Não'}</Campo>
                  <Campo label="Tratamento">{pr.fichaVaPro.tratamento}</Campo>
                  <Campo label="Volume drenado">{pr.fichaVaPro.volumeDrenado}</Campo>
                  <Campo label="Cateter VaPro indicado">{pr.fichaVaPro.cateterVaProIndicado ? `${pr.fichaVaPro.cateterVaProIndicado.sexo ?? ''} ${pr.fichaVaPro.cateterVaProIndicado.french ?? ''}Fr`.trim() : ''}</Campo>
                  <Campo label="Encaminhamento">{pr.fichaVaPro.encaminhamento ? ENCAMINHAMENTO_LABEL[pr.fichaVaPro.encaminhamento as EncaminhamentoIU] : ''}</Campo>
                  <Campo label="Responsável pelo cateterismo">{pr.fichaVaPro.responsavelCateterismo}</Campo>
                  <Campo label="COREN">{pr.fichaVaPro.coren}</Campo>
                </div>
                <div className="mt-3">
                  <Campo label="Outras intercorrências / medicamentos">{pr.fichaVaPro.outrasIntercorrencias}</Campo>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {pr && !pr.assinado && (
            <Button variant="outline" disabled={assinarMut.isPending} onClick={() => assinarMut.mutate()}>
              <PenLine className="mr-2 h-4 w-4" /> {assinarMut.isPending ? 'Assinando...' : 'Assinar prontuário'}
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Abre um novo atendimento (ficha SOAP em branco) já vinculado a um paciente. */
export function NovoAtendimentoDialog({
  pacienteId,
  pacienteNome,
  vaProDefault = false,
  open,
  onOpenChange,
}: {
  pacienteId: string;
  pacienteNome?: string;
  vaProDefault?: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [data, setData] = useState(dayjs().format('YYYY-MM-DDTHH:mm'));
  const [tipo, setTipo] = useState<TipoAtendimento>(TipoAtendimento.CONSULTA);
  const [queixa, setQueixa] = useState('');
  const [historia, setHistoria] = useState('');
  const [exame, setExame] = useState('');
  const [pa, setPa] = useState('');
  const [fc, setFc] = useState('');
  const [temp, setTemp] = useState('');
  const [sat, setSat] = useState('');
  const [avaliacao, setAvaliacao] = useState('');
  const [cidSearch, setCidSearch] = useState('');
  const [cidSelected, setCidSelected] = useState('');
  const [cidOpts, setCidOpts] = useState<{ value: string; label: string }[]>([]);
  const [prescricao, setPrescricao] = useState('');
  const [conduta, setConduta] = useState('');
  // Ficha VaPro / Hollister (questionário de IU amarrado ao prontuário)
  const [incluirFicha, setIncluirFicha] = useState(vaProDefault);
  const [ficha, setFicha] = useState<FichaVaPro>({});
  const setF = (patch: Partial<FichaVaPro>) => setFicha((f) => ({ ...f, ...patch }));
  const toggleTipoIU = (t: TipoIU) =>
    setFicha((f) => {
      const cur = f.tiposIU ?? [];
      return { ...f, tiposIU: cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t] };
    });

  function reset() {
    setData(dayjs().format('YYYY-MM-DDTHH:mm')); setTipo(TipoAtendimento.CONSULTA);
    setQueixa(''); setHistoria(''); setExame(''); setPa(''); setFc(''); setTemp(''); setSat('');
    setAvaliacao(''); setCidSearch(''); setCidSelected(''); setCidOpts([]); setPrescricao(''); setConduta('');
    setIncluirFicha(vaProDefault); setFicha({});
  }

  async function buscarCid(qstr: string) {
    setCidSearch(qstr);
    if (!qstr || qstr.length < 2) return setCidOpts([]);
    try {
      const r = await prontuariosApi.cid10(qstr);
      setCidOpts((r ?? []).map((c) => ({ value: c.codigo, label: `${c.codigo} — ${c.descricao}` })));
    } catch { setCidOpts([]); }
  }

  const createMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => prontuariosApi.create(payload),
    onSuccess: () => {
      toast.success('Atendimento registrado.');
      reset();
      onOpenChange(false);
      void qc.invalidateQueries({ queryKey: ['prontuarios'] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  function submit() {
    if (!queixa) { toast.error('Informe ao menos a queixa principal.'); return; }
    const sinaisVitais: Record<string, unknown> = {};
    if (pa) sinaisVitais.pressaoArterial = pa;
    if (fc) sinaisVitais.frequenciaCardiaca = Number(fc);
    if (temp) sinaisVitais.temperatura = Number(temp);
    if (sat) sinaisVitais.saturacaoO2 = Number(sat);
    createMut.mutate({
      clinicaId: user?.clinicaId,
      pacienteId,
      dataAtendimento: dayjs(data).toISOString(),
      tipo,
      subjetivo: { queixaPrincipal: queixa, hda: historia || undefined },
      objetivo: { exameFisico: exame || undefined, sinaisVitais: Object.keys(sinaisVitais).length ? sinaisVitais : undefined },
      avaliacao: { hipotesesDiagnosticas: avaliacao ? [avaliacao] : undefined, cid10: cidSelected ? [cidSelected] : undefined },
      plano: { conduta: conduta || undefined, prescricao: prescricao || undefined },
      fichaVaPro: incluirFicha && Object.keys(ficha).length ? ficha : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo atendimento{pacienteNome ? ` — ${pacienteNome}` : ''}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="naData">Data do atendimento</Label>
              <Input id="naData" type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de atendimento</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAtendimento)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(TipoAtendimento).map((t) => <SelectItem key={t} value={t}>{TIPO_ATENDIMENTO_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">S — Subjetivo</p>
          <div className="space-y-2">
            <Label htmlFor="naQueixa">Queixa principal *</Label>
            <Textarea id="naQueixa" rows={2} value={queixa} onChange={(e) => setQueixa(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="naHist">História da doença atual</Label>
            <Textarea id="naHist" rows={2} value={historia} onChange={(e) => setHistoria(e.target.value)} />
          </div>

          <Separator />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">O — Objetivo</p>
          <div className="space-y-2">
            <Label htmlFor="naExame">Exame físico</Label>
            <Textarea id="naExame" rows={2} value={exame} onChange={(e) => setExame(e.target.value)} />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-2"><Label htmlFor="naPa">PA</Label><Input id="naPa" placeholder="120/80" value={pa} onChange={(e) => setPa(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="naFc">FC (bpm)</Label><Input id="naFc" inputMode="numeric" value={fc} onChange={(e) => setFc(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="naTemp">Tax (°C)</Label><Input id="naTemp" inputMode="decimal" value={temp} onChange={(e) => setTemp(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="naSat">SatO₂ (%)</Label><Input id="naSat" inputMode="numeric" value={sat} onChange={(e) => setSat(e.target.value)} /></div>
          </div>

          <Separator />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">A — Avaliação</p>
          <div className="space-y-2">
            <Label htmlFor="naAval">Hipótese diagnóstica</Label>
            <Textarea id="naAval" rows={2} value={avaliacao} onChange={(e) => setAvaliacao(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="naCid">CID-10</Label>
            <Input id="naCid" placeholder="Digite para buscar (ex.: J11)" value={cidSearch} onChange={(e) => buscarCid(e.target.value)} />
            {cidOpts.length > 0 && (
              <div className="glass rounded-lg p-1 space-y-0.5 max-h-40 overflow-y-auto">
                {cidOpts.map((o) => (
                  <button key={o.value} type="button"
                    className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-white/5 text-foreground"
                    onClick={() => { setCidSelected(o.value); setCidSearch(o.label); setCidOpts([]); }}>
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Separator />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">P — Plano</p>
          <div className="space-y-2">
            <Label htmlFor="naPresc">Prescrição</Label>
            <Textarea id="naPresc" rows={2} value={prescricao} onChange={(e) => setPrescricao(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="naCond">Conduta</Label>
            <Textarea id="naCond" rows={2} value={conduta} onChange={(e) => setConduta(e.target.value)} />
          </div>

          <Separator />
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={incluirFicha} onCheckedChange={(c) => setIncluirFicha(!!c)} />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Ficha VaPro (Hollister) — Avaliação de Incontinência Urinária
            </span>
          </label>

          {incluirFicha && (
            <div className="space-y-4 glass rounded-xl p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Local de atendimento</Label>
                  <Select value={ficha.local ?? undefined} onValueChange={(v) => setF({ local: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{Object.values(LocalAtendimento).map((l) => <SelectItem key={l} value={l}>{LOCAL_LABEL[l]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Início dos sintomas</Label>
                  <Input value={ficha.inicioSintomas ?? ''} onChange={(e) => setF({ inicioSintomas: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Motivo da IU</Label>
                <Textarea rows={2} value={ficha.motivoIU ?? ''} onChange={(e) => setF({ motivoIU: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Perfil do cliente</Label>
                  <Select value={ficha.perfilCliente ?? undefined} onValueChange={(v) => setF({ perfilCliente: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{Object.values(PerfilCliente).map((x) => <SelectItem key={x} value={x}>{PERFIL_LABEL[x]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Destreza</Label>
                  <Select value={ficha.destreza ?? undefined} onValueChange={(v) => setF({ destreza: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{Object.values(Destreza).map((x) => <SelectItem key={x} value={x}>{DESTREZA_LABEL[x]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Tipo de Incontinência Urinária</Label>
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  {Object.values(TipoIU).map((t) => (
                    <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={(ficha.tiposIU ?? []).includes(t)} onCheckedChange={() => toggleTipoIU(t)} /> {TIPO_IU_LABEL[t]}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={!!ficha.dntui} onCheckedChange={(c) => setF({ dntui: !!c })} /> DNTUI</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={!!ficha.miccaoEspontanea} onCheckedChange={(c) => setF({ miccaoEspontanea: !!c })} /> Micção espontânea</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={!!ficha.realizaCateterismo} onCheckedChange={(c) => setF({ realizaCateterismo: !!c })} /> Realiza cateterismo</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={!!ficha.emTratamento} onCheckedChange={(c) => setF({ emTratamento: !!c })} /> Em tratamento</label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Cateterismos/dia</Label><Input inputMode="numeric" value={ficha.cateterismosDia ?? ''} onChange={(e) => setF({ cateterismosDia: e.target.value ? Number(e.target.value) : undefined })} /></div>
                <div className="space-y-2"><Label>Cateter utilizado</Label><Input value={ficha.cateterUtilizado ?? ''} onChange={(e) => setF({ cateterUtilizado: e.target.value })} /></div>
                <div className="space-y-2"><Label>Última ITU</Label><Input value={ficha.ultimaInfeccaoUrinaria ?? ''} onChange={(e) => setF({ ultimaInfeccaoUrinaria: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Volume drenado</Label><Input value={ficha.volumeDrenado ?? ''} onChange={(e) => setF({ volumeDrenado: e.target.value })} /></div>
                <div className="space-y-2"><Label>Tratamento</Label><Input value={ficha.tratamento ?? ''} onChange={(e) => setF({ tratamento: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Outras intercorrências / medicamentos</Label><Textarea rows={2} value={ficha.outrasIntercorrencias ?? ''} onChange={(e) => setF({ outrasIntercorrencias: e.target.value })} /></div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Cateter VaPro — sexo</Label>
                  <Select value={ficha.cateterVaProIndicado?.sexo ?? undefined} onValueChange={(v) => setF({ cateterVaProIndicado: { ...ficha.cateterVaProIndicado, sexo: v } })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent><SelectItem value="feminino">Feminino</SelectItem><SelectItem value="masculino">Masculino</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>French (Fr)</Label><Input inputMode="numeric" value={ficha.cateterVaProIndicado?.french ?? ''} onChange={(e) => setF({ cateterVaProIndicado: { ...ficha.cateterVaProIndicado, french: e.target.value ? Number(e.target.value) : undefined } })} /></div>
                <div className="space-y-2">
                  <Label>Encaminhamento</Label>
                  <Select value={ficha.encaminhamento ?? undefined} onValueChange={(v) => setF({ encaminhamento: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{Object.values(EncaminhamentoIU).map((x) => <SelectItem key={x} value={x}>{ENCAMINHAMENTO_LABEL[x]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Responsável pelo cateterismo</Label><Input value={ficha.responsavelCateterismo ?? ''} onChange={(e) => setF({ responsavelCateterismo: e.target.value })} /></div>
                <div className="space-y-2"><Label>COREN</Label><Input value={ficha.coren ?? ''} onChange={(e) => setF({ coren: e.target.value })} /></div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={!!ficha.autorizaPesquisa} onCheckedChange={(c) => setF({ autorizaPesquisa: !!c })} /> Autoriza uso de dados (pesquisa Hollister)</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={!!ficha.aceitaInformacoes} onCheckedChange={(c) => setF({ aceitaInformacoes: !!c })} /> Aceita informações por e-mail/WhatsApp</label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>E-mail de contato</Label><Input value={ficha.emailContato ?? ''} onChange={(e) => setF({ emailContato: e.target.value })} /></div>
                <div className="space-y-2"><Label>WhatsApp de contato</Label><Input value={ficha.whatsappContato ?? ''} onChange={(e) => setF({ whatsappContato: e.target.value })} /></div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={createMut.isPending}>{createMut.isPending ? 'Registrando...' : 'Registrar atendimento'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
