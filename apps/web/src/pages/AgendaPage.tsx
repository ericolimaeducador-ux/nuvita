import { useMemo, useState } from 'react';
import { useSaidaProtegida } from '@/lib/saida-protegida';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Plus, MoreVertical, CalendarDays, List } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { AgendaCalendario } from '@/components/AgendaCalendario';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { agendaApi, pacientesApi } from '@/api/resources';
import { apiErrorMessage, avisarErroDeAcao } from '@/api/client';
import { toItems, formatCpf } from '@/utils';
import { ErroConsulta } from '@/components/ErroConsulta';
import { useAuth } from '@/auth/AuthContext';
import { toast } from '@/components/ui/use-toast';
import {
  ModalidadeAtendimento,
  MODALIDADE_LABEL,
  Papel,
  PAPEIS_PROFISSIONAIS,
  StatusAgendamento,
  STATUS_AGENDAMENTO_LABEL,
  TipoAgendamento,
  TIPOS_POR_MODALIDADE,
  TIPO_AGENDAMENTO_LABEL,
  TIPO_ATENDIMENTO_POR_AGENDAMENTO,
  type Agendamento,
  type Paciente,
} from '@/types';

function statusVariant(s: StatusAgendamento): 'default' | 'success' | 'destructive' | 'warning' | 'secondary' {
  const map: Record<StatusAgendamento, 'default' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
    [StatusAgendamento.AGENDADO]: 'default',
    [StatusAgendamento.CONFIRMADO]: 'secondary',
    [StatusAgendamento.CONCLUIDO]: 'success',
    [StatusAgendamento.CANCELADO]: 'destructive',
    [StatusAgendamento.FALTA]: 'warning',
  };
  return map[s] ?? 'secondary';
}

export function AgendaPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dia, setDia] = useState(dayjs().format('YYYY-MM-DD'));
  const [open, setOpen] = useState(false);
  const [agParaCancelar, setAgParaCancelar] = useState<Agendamento | null>(null);
  const [visao, setVisao] = useState<'calendario' | 'lista'>('calendario');

  // Form state
  const [fModalidade, setFModalidade] = useState<ModalidadeAtendimento>(ModalidadeAtendimento.PSICOLOGIA);
  const [fPacienteId, setFPacienteId] = useState('');
  const [fMedicoId, setFMedicoId] = useState(
    user && PAPEIS_PROFISSIONAIS.includes(user.papel) ? user.id : ''
  );
  const [fTipo, setFTipo] = useState<TipoAgendamento | ''>('');
  const [fInicio, setFInicio] = useState('');
  const [fFim, setFFim] = useState('');
  const [fObs, setFObs] = useState('');

  const podeConcluir =
    !!user && (PAPEIS_PROFISSIONAIS.includes(user.papel) || user.papel === Papel.ADMIN);

  const dataInicio = dayjs(dia).startOf('day').toISOString();
  const dataFim = dayjs(dia).endOf('day').toISOString();

  const listQ = useQuery({
    queryKey: ['agenda', dataInicio, dataFim],
    queryFn: () => agendaApi.list({ dataInicio, dataFim }),
  });
  const pacientesQ = useQuery({
    queryKey: ['pacientes', 'select'],
    queryFn: () => pacientesApi.list({ limit: 100 }),
  });

  const createMut = useMutation({
    mutationFn: (payload: Parameters<typeof agendaApi.create>[0]) => agendaApi.create(payload),
    onSuccess: () => {
      toast.success('Agendamento criado.');
      setOpen(false);
      resetForm();
      void qc.invalidateQueries({ queryKey: ['agenda'] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const acaoMut = useMutation({
    mutationFn: (v: { id: string; acao: 'cancelar' | 'concluir' }) =>
      v.acao === 'cancelar' ? agendaApi.cancelar(v.id) : agendaApi.concluir(v.id),
    onSuccess: () => {
      toast.success('Agendamento atualizado.');
      setAgParaCancelar(null);
      void qc.invalidateQueries({ queryKey: ['agenda'] });
    },
    onError: avisarErroDeAcao,
  });

  const agendamentos = toItems<Agendamento>(listQ.data as never);
  const pacientes = toItems<Paciente>(pacientesQ.data as never);
  const tiposDisponiveis = TIPOS_POR_MODALIDADE[fModalidade] ?? Object.values(TipoAgendamento);
  const nomePorPacienteId = useMemo(
    () => new Map(pacientes.map((p) => [p.id, p.nome])),
    [pacientes],
  );

  function iniciarAtendimento(_a: Agendamento) {
    navigate('/atendimento-psicologico');
  }

  function resetForm() {
    setFModalidade(ModalidadeAtendimento.PSICOLOGIA);
    setFPacienteId('');
    setFMedicoId(user && PAPEIS_PROFISSIONAIS.includes(user.papel) ? user.id : '');
    setFTipo('');
    setFInicio('');
    setFFim('');
    setFObs('');
  }

  // Clique fora/ESC não fecham; Cancelar com algo preenchido pede confirmação.
  const saida = useSaidaProtegida(
    !!fObs.trim() || !!fPacienteId || !!fTipo || !!fInicio || !!fFim,
    () => { setOpen(false); resetForm(); },
  );

  function submit() {
    if (!fPacienteId || !fMedicoId || !fTipo || !fInicio || !fFim) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    createMut.mutate({
      clinicaId: user?.clinicaId ?? '',
      pacienteId: fPacienteId,
      medicoId: fMedicoId,
      modalidade: fModalidade,
      dataHoraInicio: dayjs(fInicio).toISOString(),
      dataHoraFim: dayjs(fFim).toISOString(),
      tipo: fTipo as TipoAgendamento,
      observacoes: fObs || undefined,
    });
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Agenda"
        subtitle="Agendamentos de atendimento psicológico"
        extra={
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border p-0.5">
              <Button
                size="sm"
                variant={visao === 'calendario' ? 'default' : 'ghost'}
                onClick={() => setVisao('calendario')}
              >
                <CalendarDays className="mr-2 h-4 w-4" /> Calendário
              </Button>
              <Button
                size="sm"
                variant={visao === 'lista' ? 'default' : 'ghost'}
                onClick={() => setVisao('lista')}
              >
                <List className="mr-2 h-4 w-4" /> Lista
              </Button>
            </div>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo agendamento
            </Button>
          </div>
        }
      />

      {/* Sem a lista de pacientes, linhas sem nome caem no ID e o seletor do novo agendamento fica vazio. */}
      {pacientesQ.isError && (
        <ErroConsulta className="mb-4" erro={pacientesQ.error} refetch={pacientesQ.refetch} recurso="os nomes dos pacientes" />
      )}

      {visao === 'calendario' ? (
        <Card>
          <CardContent className="p-6">
            <AgendaCalendario
              nomePorPacienteId={nomePorPacienteId}
              podeConcluir={podeConcluir}
              onIniciarAtendimento={iniciarAtendimento}
            />
          </CardContent>
        </Card>
      ) : (
      <Card>
        <CardContent className="p-6">
          <div className="mb-4">
            <Label htmlFor="dia">Data</Label>
            <Input
              id="dia"
              type="date"
              className="max-w-xs mt-1"
              value={dia}
              onChange={(e) => setDia(e.target.value)}
            />
          </div>

          {listQ.isLoading ? (
            <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : listQ.isError ? (
            <ErroConsulta erro={listQ.error} refetch={listQ.refetch} recurso="os agendamentos do dia" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Horário</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {agendamentos.map((a) => {
                  const encerrado = a.status === StatusAgendamento.CANCELADO || a.status === StatusAgendamento.CONCLUIDO;
                  const podeIniciar =
                    (a.status === StatusAgendamento.AGENDADO || a.status === StatusAgendamento.CONFIRMADO) &&
                    !!TIPO_ATENDIMENTO_POR_AGENDAMENTO[a.tipo];
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {dayjs(a.dataHoraInicio).format('HH:mm')} – {dayjs(a.dataHoraFim).format('HH:mm')}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{a.pacienteNome ?? nomePorPacienteId.get(a.pacienteId) ?? a.pacienteId}</div>
                        {a.pacienteCpf && <div className="text-xs text-muted-foreground">CPF {formatCpf(a.pacienteCpf)}</div>}
                      </TableCell>
                      <TableCell>{MODALIDADE_LABEL[a.modalidade] ?? a.modalidade}</TableCell>
                      <TableCell>{TIPO_AGENDAMENTO_LABEL[a.tipo] ?? a.tipo}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(a.status)}>{STATUS_AGENDAMENTO_LABEL[a.status] ?? a.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {!encerrado && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {podeIniciar && (
                                <>
                                  <DropdownMenuItem onClick={() => iniciarAtendimento(a)}>
                                    Iniciar atendimento
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {podeConcluir && (
                                <>
                                  <DropdownMenuItem onClick={() => acaoMut.mutate({ id: a.id, acao: 'concluir' })}>
                                    Concluir atendimento
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setAgParaCancelar(a)}
                              >
                                Cancelar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {agendamentos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum agendamento para este dia</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      )}

      <Dialog open={!!agParaCancelar} onOpenChange={(o) => { if (!o) setAgParaCancelar(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancelar agendamento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cancelar o agendamento de{' '}
            <span className="font-medium text-foreground">
              {agParaCancelar?.pacienteNome
                ?? (agParaCancelar ? nomePorPacienteId.get(agParaCancelar.pacienteId) : null)
                ?? agParaCancelar?.pacienteId}
            </span>{' '}
            em {agParaCancelar && dayjs(agParaCancelar.dataHoraInicio).format('DD/MM/YYYY [às] HH:mm')}?
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAgParaCancelar(null)} disabled={acaoMut.isPending}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={() => agParaCancelar && acaoMut.mutate({ id: agParaCancelar.id, acao: 'cancelar' })}
              disabled={acaoMut.isPending}
            >
              {acaoMut.isPending ? 'Cancelando…' : 'Cancelar agendamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={saida.onOpenChange}>
        <DialogContent className="max-w-md" {...saida.contentProps}>
          <DialogHeader>
            <DialogTitle>Novo agendamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Modalidade</Label>
              <Select value={fModalidade} onValueChange={(v) => { setFModalidade(v as ModalidadeAtendimento); setFTipo(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(ModalidadeAtendimento).map((m) => (
                    <SelectItem key={m} value={m}>{MODALIDADE_LABEL[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Paciente</Label>
              <Select value={fPacienteId} onValueChange={setFPacienteId}>
                <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
                <SelectContent>
                  {pacientes.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="medicoId">ID do profissional responsável</Label>
              <Input id="medicoId" placeholder="ID do médico ou enfermeiro" value={fMedicoId} onChange={(e) => setFMedicoId(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="fInicio">Início</Label>
                <Input id="fInicio" type="datetime-local" value={fInicio} onChange={(e) => setFInicio(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fFim">Fim</Label>
                <Input id="fFim" type="datetime-local" value={fFim} onChange={(e) => setFFim(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={fTipo} onValueChange={(v) => setFTipo(v as TipoAgendamento)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {tiposDisponiveis.map((t) => <SelectItem key={t} value={t}>{TIPO_AGENDAMENTO_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fObs">Observações</Label>
              <Textarea id="fObs" rows={3} maxLength={1000} value={fObs} onChange={(e) => setFObs(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={saida.solicitarFechar}>Cancelar</Button>
            <Button onClick={submit} disabled={createMut.isPending}>{createMut.isPending ? 'Agendando...' : 'Agendar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
