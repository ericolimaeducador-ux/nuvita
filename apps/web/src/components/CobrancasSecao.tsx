import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Ban, BellRing, CheckCircle2, Pencil, Plus } from 'lucide-react';
import { ErroConsulta } from '@/components/ErroConsulta';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { apiErrorMessage } from '@/api/client';
import { cobrancasApi } from '@/api/resources';
import { useSaidaProtegida } from '@/lib/saida-protegida';
import { centavosParaInput, reaisParaCentavos } from '@/lib/dinheiro';
import { formatBRL, toItems } from '@/utils';
import {
  FORMA_PAGAMENTO_COBRANCA_LABEL, FormaPagamentoCobranca, STATUS_COBRANCA_LABEL, StatusCobranca,
  TIPO_COBRANCA_LABEL, TipoCobranca, type Cobranca,
} from '@/types';

/**
 * Financeiro do paciente: REGISTRO de cobranças + AVISOS. O sistema NÃO recebe dinheiro de paciente (a clínica recebe por
 * fora): "Marcar paga" é uma anotação manual de quem recebeu, e o aviso só notifica por e-mail/WhatsApp.
 * TODO(conteudo): rótulos e textos de cobrança — revisar na etapa de conteúdo.
 */

interface FormCobranca {
  tipo: TipoCobranca | '';
  descricao: string;
  valor: string;
  formaPagamento: FormaPagamentoCobranca | '';
  parcelas: string;
  vencimento: string;
}

const VAZIO = (): FormCobranca => ({
  tipo: '', descricao: '', valor: '', formaPagamento: '', parcelas: '', vencimento: dayjs().format('YYYY-MM-DD'),
});

const SEM_FORMA = 'nao_informar';

const aberta = (c: Cobranca) => c.status !== StatusCobranca.PAGA && c.status !== StatusCobranca.CANCELADA;

export function CobrancasSecao({ pacienteId }: { pacienteId: string }) {
  const qc = useQueryClient();
  const [editando, setEditando] = useState<Cobranca | 'nova' | null>(null);
  const [form, setForm] = useState<FormCobranca>(VAZIO());
  const [avisando, setAvisando] = useState<Cobranca | null>(null);
  const [canais, setCanais] = useState({ email: true, whatsapp: false });
  const [pagando, setPagando] = useState<Cobranca | null>(null);
  const [formaPaga, setFormaPaga] = useState<string>(SEM_FORMA);
  const [cancelando, setCancelando] = useState<Cobranca | null>(null);
  const [motivo, setMotivo] = useState('');

  const listQ = useQuery({ queryKey: ['cobrancas', pacienteId], queryFn: () => cobrancasApi.listByPaciente(pacienteId) });
  const cobrancas = toItems<Cobranca>(listQ.data as never);

  const valorCentavos = reaisParaCentavos(form.valor);
  const formOk = !!form.tipo && !!form.descricao.trim() && !!form.vencimento && Number.isFinite(valorCentavos);
  const sujo = editando !== null && (!!form.descricao.trim() || !!form.valor.trim() || !!form.tipo);
  const fechar = () => { setEditando(null); setForm(VAZIO()); };
  const saida = useSaidaProtegida(sujo, fechar);

  const revalidar = () => {
    void qc.invalidateQueries({ queryKey: ['cobrancas', pacienteId] });
    void qc.invalidateQueries({ queryKey: ['cobrancas-resumo'] });
  };

  const salvarMut = useMutation({
    mutationFn: () => {
      const base = {
        tipo: form.tipo as string,
        descricao: form.descricao.trim(),
        valorCentavos,
        formaPagamento: form.formaPagamento || undefined,
        parcelas: form.parcelas ? Number(form.parcelas) : undefined,
        vencimento: form.vencimento,
      };
      return editando && editando !== 'nova' ? cobrancasApi.update(editando.id, base) : cobrancasApi.create({ ...base, pacienteId });
    },
    onSuccess: () => { toast.success('Cobrança salva.'); fechar(); revalidar(); },
    onError: (e) => toast.error('Erro ao salvar a cobrança', apiErrorMessage(e)),
  });
  const atalhoMut = useMutation({
    mutationFn: () => cobrancasApi.criarConsultaAvaliacao(pacienteId),
    onSuccess: () => { toast.success('Cobrança da consulta de avaliação registrada.'); revalidar(); },
    onError: (e) => toast.error('Erro ao registrar a consulta de avaliação', apiErrorMessage(e)),
  });
  const pagaMut = useMutation({
    mutationFn: (c: Cobranca) => cobrancasApi.marcarPaga(c.id, formaPaga === SEM_FORMA ? undefined : formaPaga),
    onSuccess: () => { toast.success('Cobrança marcada como paga.'); setPagando(null); setFormaPaga(SEM_FORMA); revalidar(); },
    onError: (e) => toast.error('Erro ao marcar como paga', apiErrorMessage(e)),
  });
  const avisoMut = useMutation({
    mutationFn: (c: Cobranca) =>
      cobrancasApi.enviarAviso(c.id, [...(canais.email ? ['email' as const] : []), ...(canais.whatsapp ? ['whatsapp' as const] : [])]),
    onSuccess: (r) => {
      const falhas = r.canais.filter((c) => !c.ok);
      if (falhas.length > 0) toast.error('Aviso parcial', falhas.map((f) => `${f.canal}: ${f.erro}`).join('; '));
      else toast.success('Aviso enviado.');
      setAvisando(null);
      revalidar();
    },
    onError: (e) => toast.error('Erro ao enviar o aviso', apiErrorMessage(e)),
  });
  const cancelarMut = useMutation({
    mutationFn: (c: Cobranca) => cobrancasApi.cancelar(c.id, motivo.trim()),
    onSuccess: () => { toast.success('Cobrança cancelada.'); setCancelando(null); setMotivo(''); revalidar(); },
    onError: (e) => toast.error('Erro ao cancelar a cobrança', apiErrorMessage(e)),
  });

  function abrirEdicao(c: Cobranca) {
    setForm({
      tipo: c.tipo,
      descricao: c.descricao,
      valor: centavosParaInput(c.valorCentavos),
      formaPagamento: c.formaPagamento ?? '',
      parcelas: c.parcelas ? String(c.parcelas) : '',
      vencimento: c.vencimento.slice(0, 10),
    });
    setEditando(c);
  }

  return (
    <section aria-label="Financeiro do paciente" className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 p-4">
        <span className="font-semibold text-foreground">Financeiro</span>
        {!listQ.isError && <Badge variant="secondary">{cobrancas.length}</Badge>}
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={() => atalhoMut.mutate()} disabled={atalhoMut.isPending}>
          Consulta de avaliação
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setForm(VAZIO()); setEditando('nova'); }}>
          <Plus className="mr-2 h-4 w-4" /> Nova cobrança
        </Button>
      </div>

      <div className="px-4 pb-4">
        {listQ.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : listQ.isError ? (
          <ErroConsulta erro={listQ.error} refetch={listQ.refetch} recurso="as cobranças" />
        ) : cobrancas.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">Nenhuma cobrança registrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vencimento</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="w-36" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {cobrancas.map((c) => (
                <TableRow key={c.id}>
                  {/* Vencimento é uma data de calendário (UTC): formatar pelo texto evita o dia anterior no fuso local. */}
                  <TableCell>{c.vencimento.slice(0, 10).split('-').reverse().join('/')}</TableCell>
                  <TableCell className="text-sm">
                    <div>{c.descricao}</div>
                    <div className="text-xs text-muted-foreground">{TIPO_COBRANCA_LABEL[c.tipo] ?? c.tipo}</div>
                  </TableCell>
                  <TableCell>
                    {c.formaPagamento ? FORMA_PAGAMENTO_COBRANCA_LABEL[c.formaPagamento] ?? c.formaPagamento : '—'}
                    {c.parcelas ? ` · ${c.parcelas}x` : ''}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.status === StatusCobranca.PAGA ? 'secondary' : 'outline'}>
                      {STATUS_COBRANCA_LABEL[c.status] ?? c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatBRL(c.valorCentavos / 100)}</TableCell>
                  <TableCell className="text-right">
                    {aberta(c) && (
                      <>
                        <Button type="button" variant="ghost" size="icon" aria-label={`Editar cobrança ${c.descricao}`} onClick={() => abrirEdicao(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" aria-label={`Enviar aviso ${c.descricao}`} onClick={() => setAvisando(c)}>
                          <BellRing className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" aria-label={`Marcar paga ${c.descricao}`} onClick={() => { setFormaPaga(c.formaPagamento ?? SEM_FORMA); setPagando(c); }}>
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" aria-label={`Cancelar cobrança ${c.descricao}`} onClick={() => setCancelando(c)}>
                          <Ban className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={editando !== null} onOpenChange={saida.onOpenChange}>
        <DialogContent className="max-w-lg" {...saida.contentProps}>
          <DialogHeader><DialogTitle>{editando === 'nova' ? 'Nova cobrança' : 'Editar cobrança'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={form.tipo || undefined} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as TipoCobranca }))}>
                <SelectTrigger aria-label="Tipo"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.values(TipoCobranca).filter((t) => t !== TipoCobranca.CONSULTA_ENFERMAGEM).map((t) => <SelectItem key={t} value={t}>{TIPO_COBRANCA_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cobValor">Valor (R$) *</Label>
              <Input id="cobValor" inputMode="decimal" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="cobDesc">Descrição *</Label>
              <Textarea id="cobDesc" rows={2} placeholder="O que a cobrança inclui" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <Select value={form.formaPagamento || undefined} onValueChange={(v) => setForm((f) => ({ ...f, formaPagamento: v as FormaPagamentoCobranca }))}>
                <SelectTrigger aria-label="Forma de pagamento"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.values(FormaPagamentoCobranca).map((fp) => <SelectItem key={fp} value={fp}>{FORMA_PAGAMENTO_COBRANCA_LABEL[fp]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cobParc">Parcelas</Label>
              <Input id="cobParc" type="number" min={1} max={48} value={form.parcelas} onChange={(e) => setForm((f) => ({ ...f, parcelas: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="cobVenc">Vencimento *</Label>
              <Input id="cobVenc" type="date" value={form.vencimento} onChange={(e) => setForm((f) => ({ ...f, vencimento: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={saida.solicitarFechar}>Cancelar</Button>
            <Button onClick={() => salvarMut.mutate()} disabled={!formOk || salvarMut.isPending}>
              {salvarMut.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={avisando !== null} onOpenChange={(a) => { if (!a) setAvisando(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Enviar aviso de cobrança</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">O aviso é enviado ao paciente (ou ao responsável legal, se menor).</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox id="avEmail" checked={canais.email} onCheckedChange={(c) => setCanais((v) => ({ ...v, email: !!c }))} />
              <Label htmlFor="avEmail">E-mail</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="avZap" checked={canais.whatsapp} onCheckedChange={(c) => setCanais((v) => ({ ...v, whatsapp: !!c }))} />
              <Label htmlFor="avZap">WhatsApp</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAvisando(null)}>Cancelar</Button>
            <Button disabled={(!canais.email && !canais.whatsapp) || avisoMut.isPending} onClick={() => avisando && avisoMut.mutate(avisando)}>
              {avisoMut.isPending ? 'Enviando…' : 'Enviar aviso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pagando !== null} onOpenChange={(a) => { if (!a) { setPagando(null); setFormaPaga(SEM_FORMA); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Marcar como paga</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Anota que a clínica recebeu por fora (o sistema não processa pagamento). Fica registrado quem marcou e quando.
          </p>
          <div className="space-y-2">
            <Label>Forma de pagamento (opcional)</Label>
            <Select value={formaPaga} onValueChange={setFormaPaga}>
              <SelectTrigger aria-label="Forma de pagamento recebida"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={SEM_FORMA}>Não informar</SelectItem>
                {Object.values(FormaPagamentoCobranca).map((fp) => (
                  <SelectItem key={fp} value={fp}>{FORMA_PAGAMENTO_COBRANCA_LABEL[fp]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPagando(null); setFormaPaga(SEM_FORMA); }}>Voltar</Button>
            <Button disabled={pagaMut.isPending} onClick={() => pagando && pagaMut.mutate(pagando)}>
              {pagaMut.isPending ? 'Salvando…' : 'Confirmar pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelando !== null} onOpenChange={(a) => { if (!a) { setCancelando(null); setMotivo(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Cancelar cobrança?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">A cobrança fica registrada como cancelada (nada é apagado).</p>
          <div className="space-y-2">
            <Label htmlFor="cobMotivo">Motivo *</Label>
            <Textarea id="cobMotivo" rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelando(null); setMotivo(''); }}>Voltar</Button>
            <Button variant="destructive" disabled={!motivo.trim() || cancelarMut.isPending} onClick={() => cancelando && cancelarMut.mutate(cancelando)}>
              {cancelarMut.isPending ? 'Cancelando…' : 'Cancelar cobrança'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
