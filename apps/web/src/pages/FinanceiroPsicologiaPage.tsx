import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  AlertTriangle, BadgeCheck, CircleDollarSign, Clock, Loader2, PiggyBank, Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { psicoFinanceiroApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { formatBRL, formatData } from '@/utils';
import {
  FORMA_PAGAMENTO_LABEL, FormaPagamento, PacientePsicologia, PainelPsicologia,
  StatusCiclo, StatusLancamento, STATUS_CICLO_LABEL, rotuloProximaSessao,
} from '@/types';

const CICLO_BADGE: Record<StatusCiclo, string> = {
  [StatusCiclo.A_COBRAR]: 'text-amber-600 border-amber-500/40 bg-amber-500/10',
  [StatusCiclo.AGUARDANDO_PAGAMENTO]: 'text-blue-600 border-blue-500/40 bg-blue-500/10',
  [StatusCiclo.EM_DIA]: 'text-emerald-600 border-emerald-500/40 bg-emerald-500/10',
};

function Indicador({
  titulo, valor, detalhe, icone: Icone, destaque,
}: {
  titulo: string; valor: string; detalhe?: string; icone: React.ElementType; destaque?: boolean;
}) {
  return (
    <Card className={destaque ? 'border-amber-500/40 bg-amber-500/5' : undefined}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{titulo}</p>
          <Icone className={`h-4 w-4 ${destaque ? 'text-amber-600' : 'text-muted-foreground'}`} />
        </div>
        <p className="text-2xl font-semibold mt-1">{valor}</p>
        {detalhe && <p className="text-xs text-muted-foreground mt-1">{detalhe}</p>}
      </CardContent>
    </Card>
  );
}

/** Progresso do ciclo: quantas das 4 sessões já foram feitas. */
function ProgressoCiclo({ feitas, total }: { feitas: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5" title={`${feitas} de ${total} sessões do ciclo`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-6 rounded-full ${i < feitas ? 'bg-brand-cobalt' : 'bg-muted'}`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dialog: cobrar o ciclo
// ---------------------------------------------------------------------------

function CobrarCicloDialog({
  paciente, valorSugerido, open, onClose,
}: {
  paciente: PacientePsicologia | null;
  valorSugerido?: number;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [valor, setValor] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento | ''>('');
  const [vencimento, setVencimento] = useState('');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    if (!open || !paciente) return;
    setValor(valorSugerido ? String(valorSugerido) : '');
    setFormaPagamento('');
    setVencimento(dayjs().format('YYYY-MM-DD'));
    setObservacoes('');
  }, [open, paciente, valorSugerido]);

  const cobrarM = useMutation({
    mutationFn: () =>
      psicoFinanceiroApi.cobrar({
        pacienteId: paciente!.pacienteId,
        ciclo: paciente!.cicloAtual,
        valor: Number(valor),
        formaPagamento: formaPagamento || undefined,
        vencimento: vencimento ? dayjs(vencimento).toISOString() : undefined,
        observacoes: observacoes || undefined,
      }),
    onSuccess: () => {
      toast({ title: 'Cobrança criada.', description: 'Ela fica pendente até você registrar o recebimento.' });
      queryClient.invalidateQueries({ queryKey: ['painel-psicologia'] });
      onClose();
    },
    onError: (e) => toast({ title: 'Erro ao criar a cobrança', description: apiErrorMessage(e), variant: 'destructive' }),
  });

  const submeter = () => {
    if (!Number(valor) || Number(valor) <= 0) {
      toast({ title: 'Informe o valor do ciclo.', variant: 'destructive' });
      return;
    }
    cobrarM.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !cobrarM.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cobrar ciclo {paciente?.cicloAtual}</DialogTitle>
          <DialogDescription>
            {paciente?.pacienteNome ?? 'Paciente'} — pacote de 4 sessões
            {paciente && paciente.sessoesRealizadas > 0
              ? ` (sessões ${paciente.proximaSessao} a ${paciente.proximaSessao + 3})`
              : ' (sessões 1 a 4)'}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Valor do ciclo (R$)</Label>
            <Input
              type="number" min={0} step="0.01" value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
            />
            {valorSugerido ? (
              <p className="text-xs text-muted-foreground">
                Sugerido: {formatBRL(valorSugerido)} (4 × seu preço de sessão). Pode alterar.
              </p>
            ) : (
              <p className="text-xs text-amber-600">
                Cadastre seu preço de sessão no topo da página para o valor vir preenchido.
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Forma de pagamento</Label>
              <Select value={formaPagamento} onValueChange={(v) => setFormaPagamento(v as FormaPagamento)}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {Object.values(FormaPagamento).map((f) => (
                    <SelectItem key={f} value={f}>{FORMA_PAGAMENTO_LABEL[f]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Opcional" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={cobrarM.isPending}>Cancelar</Button>
          <Button onClick={submeter} disabled={cobrarM.isPending}>
            {cobrarM.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Criar cobrança
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Linha do paciente
// ---------------------------------------------------------------------------

function LinhaPaciente({
  p, sessoesPorCiclo, onCobrar,
}: { p: PacientePsicologia; sessoesPorCiclo: number; onCobrar: () => void }) {
  const queryClient = useQueryClient();
  const [aberto, setAberto] = useState(false);

  const receberM = useMutation({
    mutationFn: (id: string) => psicoFinanceiroApi.receber(id),
    onSuccess: () => {
      toast({ title: 'Pagamento registrado.' });
      queryClient.invalidateQueries({ queryKey: ['painel-psicologia'] });
    },
    onError: (e) => toast({ title: 'Erro ao registrar o pagamento', description: apiErrorMessage(e), variant: 'destructive' }),
  });

  const cancelarM = useMutation({
    mutationFn: (id: string) => psicoFinanceiroApi.cancelar(id),
    onSuccess: () => {
      toast({ title: 'Cobrança cancelada.' });
      queryClient.invalidateQueries({ queryKey: ['painel-psicologia'] });
    },
    onError: (e) => toast({ title: 'Erro ao cancelar', description: apiErrorMessage(e), variant: 'destructive' }),
  });

  const pendente = p.cobrancas.find((c) => c.ciclo === p.cicloAtual && c.status === StatusLancamento.PENDENTE);

  return (
    <div className="rounded-xl border">
      <div className="flex flex-wrap items-center gap-4 p-4">
        <div className="min-w-48 flex-1">
          <Link to={`/pacientes/${p.pacienteId}`} className="font-medium hover:underline">
            {p.pacienteNome ?? p.pacienteId}
          </Link>
          <p className="text-sm text-muted-foreground">
            Próximo atendimento: <span className="font-medium text-foreground">{rotuloProximaSessao(p)}</span>
            {' · '}ciclo {p.cicloAtual}
            {p.ultimaSessaoEm && ` · última em ${formatData(p.ultimaSessaoEm)}`}
          </p>
        </div>

        <div className="space-y-1">
          <ProgressoCiclo feitas={p.sessoesNoCiclo} total={sessoesPorCiclo} />
          <p className="text-xs text-muted-foreground">
            {p.sessoesNoCiclo} de {sessoesPorCiclo} sessões do ciclo
            {p.statusCiclo !== StatusCiclo.A_COBRAR &&
              ` · faltam ${p.sessoesAteFecharCiclo} p/ renovar`}
          </p>
        </div>

        <Badge variant="outline" className={CICLO_BADGE[p.statusCiclo]}>
          {STATUS_CICLO_LABEL[p.statusCiclo]}
        </Badge>

        <div className="min-w-28 text-right">
          {p.valorEmAberto > 0 ? (
            <>
              <p className="text-xs text-muted-foreground">Em aberto</p>
              <p className="font-semibold text-amber-600">{formatBRL(p.valorEmAberto)}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sem pendência</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {p.statusCiclo === StatusCiclo.A_COBRAR && (
            <Button size="sm" onClick={onCobrar}>
              <CircleDollarSign className="h-4 w-4 mr-2" /> Cobrar ciclo {p.cicloAtual}
            </Button>
          )}
          {pendente && (
            <Button size="sm" variant="secondary" disabled={receberM.isPending} onClick={() => receberM.mutate(pendente.id)}>
              {receberM.isPending
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <BadgeCheck className="h-4 w-4 mr-2" />}
              Registrar pagamento
            </Button>
          )}
          {p.cobrancas.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setAberto(!aberto)}>
              {aberto ? 'Ocultar' : 'Histórico'}
            </Button>
          )}
        </div>
      </div>

      {aberto && p.cobrancas.length > 0 && (
        <div className="border-t p-4 space-y-2">
          {[...p.cobrancas].reverse().map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-medium min-w-16">Ciclo {c.ciclo}</span>
              <span className="min-w-24">{formatBRL(c.valor)}</span>
              <Badge
                variant="outline"
                className={c.status === StatusLancamento.RECEBIDO
                  ? 'text-emerald-600 border-emerald-500/30'
                  : c.status === StatusLancamento.PENDENTE
                    ? 'text-amber-600 border-amber-500/30'
                    : 'text-muted-foreground'}
              >
                {c.status === StatusLancamento.RECEBIDO ? 'Recebido'
                  : c.status === StatusLancamento.PENDENTE ? 'Pendente' : 'Cancelado'}
              </Badge>
              <span className="text-muted-foreground">
                {c.recebidoEm
                  ? `Recebido em ${formatData(c.recebidoEm)}`
                  : c.vencimento ? `Vence em ${formatData(c.vencimento)}` : `Criada em ${formatData(c.criadoEm)}`}
              </span>
              {c.formaPagamento && (
                <span className="text-muted-foreground">{FORMA_PAGAMENTO_LABEL[c.formaPagamento]}</span>
              )}
              {c.status === StatusLancamento.PENDENTE && (
                <Button
                  size="sm" variant="ghost" className="ml-auto text-destructive"
                  disabled={cancelarM.isPending}
                  onClick={() => cancelarM.mutate(c.id)}
                >
                  Cancelar
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export function FinanceiroPsicologiaPage() {
  const queryClient = useQueryClient();
  const [cobrarDe, setCobrarDe] = useState<PacientePsicologia | null>(null);
  const [precoSessao, setPrecoSessao] = useState('');

  const painelQ = useQuery({
    queryKey: ['painel-psicologia'],
    queryFn: () => psicoFinanceiroApi.painel(),
  });
  const painel: PainelPsicologia | undefined = painelQ.data;

  useEffect(() => {
    if (painel?.valorSessao !== undefined) setPrecoSessao(String(painel.valorSessao));
  }, [painel?.valorSessao]);

  const salvarPrecoM = useMutation({
    mutationFn: () => psicoFinanceiroApi.salvarConfig(Number(precoSessao)),
    onSuccess: () => {
      toast({ title: 'Preço da sessão salvo.' });
      queryClient.invalidateQueries({ queryKey: ['painel-psicologia'] });
    },
    onError: (e) => toast({ title: 'Erro ao salvar o preço', description: apiErrorMessage(e), variant: 'destructive' }),
  });

  const valorCiclo = painel?.valorSessao ? painel.valorSessao * painel.sessoesPorCiclo : undefined;

  // Quem está a uma sessão de fechar o ciclo: a próxima cobrança já dá para
  // combinar com o paciente na sessão que vem, sem sustos.
  const fechandoCiclo = useMemo(
    () => (painel?.pacientes ?? []).filter(
      (p) => p.statusCiclo !== StatusCiclo.A_COBRAR && p.sessoesAteFecharCiclo === 1,
    ),
    [painel?.pacientes],
  );

  return (
    <div className="p-6">
      <PageHeader
        title="Financeiro — Psicologia"
        subtitle="Recebimento das consultas. O acompanhamento é vendido em ciclos de 4 sessões, pagos antes de começar."
      />

      {/* Preço da sessão */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4" /> Seu preço de sessão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label>Valor da sessão (R$)</Label>
              <Input
                type="number" min={0} step="0.01" className="w-40"
                value={precoSessao}
                onChange={(e) => setPrecoSessao(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <Button
              variant="secondary"
              disabled={salvarPrecoM.isPending || !Number(precoSessao)}
              onClick={() => salvarPrecoM.mutate()}
            >
              {salvarPrecoM.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
            </Button>
            {valorCiclo && (
              <p className="text-sm text-muted-foreground pb-2">
                Ciclo de {painel?.sessoesPorCiclo} sessões: <strong>{formatBRL(valorCiclo)}</strong> — é o valor sugerido em cada cobrança.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Indicadores */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Indicador
          titulo="Recebido no mês"
          valor={formatBRL(painel?.recebidoNoMes ?? 0)}
          detalhe={dayjs().format('MMMM [de] YYYY')}
          icone={PiggyBank}
        />
        <Indicador
          titulo="A receber"
          valor={formatBRL(painel?.aReceber ?? 0)}
          detalhe="Cobranças emitidas e ainda não pagas"
          icone={Clock}
        />
        <Indicador
          titulo="Ciclos a cobrar"
          valor={String(painel?.ciclosACobrar ?? 0)}
          detalhe="Pacientes sem cobrança do ciclo atual"
          icone={AlertTriangle}
          destaque={(painel?.ciclosACobrar ?? 0) > 0}
        />
        <Indicador
          titulo="Pacientes em acompanhamento"
          valor={String(painel?.pacientes.length ?? 0)}
          detalhe="Com ao menos uma sessão ou cobrança"
          icone={BadgeCheck}
        />
      </div>

      {/* Alertas */}
      {(painel?.ciclosACobrar ?? 0) > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-700">
              {painel!.ciclosACobrar === 1
                ? 'Um paciente fechou o ciclo e ainda não foi cobrado.'
                : `${painel!.ciclosACobrar} pacientes fecharam o ciclo e ainda não foram cobrados.`}
            </p>
            <p className="text-muted-foreground">
              A cobrança é do próximo pacote de {painel?.sessoesPorCiclo} sessões — combine com o paciente antes do próximo atendimento.
            </p>
          </div>
        </div>
      )}

      {fechandoCiclo.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-dashed p-4">
          <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Ciclo fechando na próxima sessão</p>
            <p className="text-muted-foreground">
              {fechandoCiclo.map((p) => p.pacienteNome ?? p.pacienteId).join(', ')} — depois desse atendimento entra a renovação.
            </p>
          </div>
        </div>
      )}

      <Separator className="mb-6" />

      {painelQ.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : painelQ.isError ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          {apiErrorMessage(painelQ.error)}
        </div>
      ) : (painel?.pacientes.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhum paciente em acompanhamento ainda. Assim que você registrar a primeira sessão, ele aparece aqui.
        </div>
      ) : (
        <div className="space-y-2">
          {painel!.pacientes.map((p) => (
            <LinhaPaciente
              key={p.pacienteId}
              p={p}
              sessoesPorCiclo={painel!.sessoesPorCiclo}
              onCobrar={() => setCobrarDe(p)}
            />
          ))}
        </div>
      )}

      <CobrarCicloDialog
        paciente={cobrarDe}
        valorSugerido={valorCiclo}
        open={!!cobrarDe}
        onClose={() => setCobrarDe(null)}
      />
    </div>
  );
}
