import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Plus, MoreVertical } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
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
import { apiErrorMessage } from '@/api/client';
import { toItems } from '@/utils';
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
  const { user } = useAuth();
  const [dia, setDia] = useState(dayjs().format('YYYY-MM-DD'));
  const [open, setOpen] = useState(false);

  // Form state
  const [fModalidade, setFModalidade] = useState<ModalidadeAtendimento>(ModalidadeAtendimento.MEDICO);
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
      void qc.invalidateQueries({ queryKey: ['agenda'] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const agendamentos = toItems<Agendamento>(listQ.data as never);
  const pacientes = toItems<Paciente>(pacientesQ.data as never);
  const tiposDisponiveis = TIPOS_POR_MODALIDADE[fModalidade] ?? Object.values(TipoAgendamento);

  function resetForm() {
    setFModalidade(ModalidadeAtendimento.MEDICO);
    setFPacienteId('');
    setFMedicoId(user && PAPEIS_PROFISSIONAIS.includes(user.papel) ? user.id : '');
    setFTipo('');
    setFInicio('');
    setFFim('');
    setFObs('');
  }

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
        subtitle="Agendamentos das três modalidades: médica, enfermagem e jurídica"
        extra={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo agendamento
          </Button>
        }
      />

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
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">
                        {dayjs(a.dataHoraInicio).format('HH:mm')} – {dayjs(a.dataHoraFim).format('HH:mm')}
                      </TableCell>
                      <TableCell>{a.pacienteId}</TableCell>
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
                                onClick={() => acaoMut.mutate({ id: a.id, acao: 'cancelar' })}
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

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="max-w-md">
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
              <Input id="medicoId" placeholder="ID do médico, enfermeiro ou advogado" value={fMedicoId} onChange={(e) => setFMedicoId(e.target.value)} />
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
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={createMut.isPending}>{createMut.isPending ? 'Agendando...' : 'Agendar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
