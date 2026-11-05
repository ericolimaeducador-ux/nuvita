import { useEffect, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { ErroConsulta } from '@/components/ErroConsulta';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { apiErrorMessage } from '@/api/client';
import { cobrancasApi } from '@/api/resources';
import { useAuth } from '@/auth/AuthContext';
import { centavosParaInput, reaisParaCentavos } from '@/lib/dinheiro';
import { formatBRL } from '@/utils';
import { Papel, STATUS_COBRANCA_LABEL, StatusCobranca } from '@/types';

const STATUS_ABERTOS = [StatusCobranca.PENDENTE, StatusCobranca.ENVIADA, StatusCobranca.VENCIDA];

/** Cobranças em aberto (pendentes, enviadas e vencidas) da clínica, com o nome do paciente; mais antigas primeiro. */
function CobrancasAbertas() {
  const q = useInfiniteQuery({
    queryKey: ['cobrancas-abertas'],
    queryFn: ({ pageParam }) => cobrancasApi.listByClinica({ status: STATUS_ABERTOS, cursor: pageParam, limit: 20 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultima) => (ultima.hasMore ? ultima.nextCursor : undefined),
  });
  const itens = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Cobranças pendentes e vencidas</CardTitle></CardHeader>
      <CardContent>
        {q.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : q.isError ? (
          <ErroConsulta erro={q.error} refetch={q.refetch} recurso="as cobranças em aberto" />
        ) : itens.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma cobrança pendente ou vencida.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">
                      <Link className="font-medium hover:underline" to={`/pacientes/${c.pacienteId}`}>{c.pacienteNome ?? 'Paciente'}</Link>
                      <div className="text-xs text-muted-foreground">{c.descricao}</div>
                    </TableCell>
                    {/* Data de calendário (UTC): formatar pelo texto evita o dia anterior no fuso local. */}
                    <TableCell>{c.vencimento.slice(0, 10).split('-').reverse().join('/')}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === StatusCobranca.VENCIDA ? 'destructive' : 'outline'}>
                        {STATUS_COBRANCA_LABEL[c.status] ?? c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatBRL(c.valorCentavos / 100)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {q.hasNextPage && (
              <div className="pt-3 text-center">
                <Button variant="outline" size="sm" onClick={() => void q.fetchNextPage()} disabled={q.isFetchingNextPage}>
                  {q.isFetchingNextPage ? 'Carregando…' : 'Carregar mais'}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Financeiro de pacientes do Estomaterapia: resumo mensal (a receber / recebido / vencido) e o valor da consulta de
 * avaliação da clínica (só ADMIN edita). O sistema só REGISTRA cobranças e envia avisos — não recebe dinheiro de paciente.
 * As cobranças de cada paciente ficam na página do paciente.
 * TODO(conteudo): títulos e textos desta tela — revisar na etapa de conteúdo.
 */
export function FinanceiroPacientesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [mes, setMes] = useState(() => dayjs().format('YYYY-MM'));
  const [valor, setValor] = useState('');
  const podeEditarValor = user?.papel === Papel.ADMIN || user?.papel === Papel.SUPER_ADMIN;

  const resumoQ = useQuery({ queryKey: ['cobrancas-resumo', mes], queryFn: () => cobrancasApi.resumo(mes), enabled: /^\d{4}-\d{2}$/.test(mes) });
  const configQ = useQuery({ queryKey: ['cobrancas-config'], queryFn: () => cobrancasApi.config() });

  useEffect(() => {
    if (configQ.data) setValor(centavosParaInput(configQ.data.valorConsultaCentavos));
  }, [configQ.data]);

  const centavos = reaisParaCentavos(valor);
  const salvarMut = useMutation({
    mutationFn: () => cobrancasApi.salvarConfig(centavos),
    onSuccess: () => { toast.success('Valor padrão da consulta de enfermagem atualizado.'); void qc.invalidateQueries({ queryKey: ['cobrancas-config'] }); },
    onError: (e) => toast.error('Erro ao salvar o valor', apiErrorMessage(e)),
  });

  const r = resumoQ.data;
  const cartoes = r
    ? [
        { titulo: 'A receber', valor: r.aReceberCentavos, qtd: r.quantidades.aReceber },
        { titulo: 'Recebido', valor: r.recebidoCentavos, qtd: r.quantidades.recebido },
        { titulo: 'Vencido', valor: r.vencidoCentavos, qtd: r.quantidades.vencido },
      ]
    : [];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Financeiro"
        description="Registro de cobranças e avisos aos pacientes. A clínica recebe por fora; aqui só se registra e se avisa."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className="space-y-6">
      <div className="flex items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="finMes">Mês</Label>
          <Input id="finMes" type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
        </div>
      </div>

      {resumoQ.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : resumoQ.isError ? (
        <ErroConsulta erro={resumoQ.error} refetch={resumoQ.refetch} recurso="o resumo do mês" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {cartoes.map((c) => (
            <Card key={c.titulo}>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{c.titulo}</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold" data-testid={`resumo-${c.titulo}`}>{formatBRL(c.valor / 100)}</div>
                <div className="text-xs text-muted-foreground">{c.qtd} cobrança(s)</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Valor padrão da consulta de enfermagem</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {configQ.isError ? (
            <ErroConsulta erro={configQ.error} refetch={configQ.refetch} recurso="a configuração" />
          ) : (
            <div className="flex items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="finValor">Valor (R$)</Label>
                <Input id="finValor" inputMode="decimal" value={valor} disabled={!podeEditarValor} onChange={(e) => setValor(e.target.value)} />
              </div>
              {podeEditarValor && (
                <Button onClick={() => salvarMut.mutate()} disabled={!Number.isFinite(centavos) || salvarMut.isPending}>
                  {salvarMut.isPending ? 'Salvando…' : 'Salvar'}
                </Button>
              )}
            </div>
          )}
          {!podeEditarValor && <p className="text-xs text-muted-foreground">Só o administrador altera este valor.</p>}
        </CardContent>
      </Card>
      </div>
      <CobrancasAbertas />
      </div>
    </div>
  );
}
