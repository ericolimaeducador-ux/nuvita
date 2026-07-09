import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Plus, Search, Copy, PowerOff } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { telemedicinaApi, type CreateSalaPayload } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { toast } from '@/components/ui/use-toast';
import {
  ModalidadeAtendimento,
  MODALIDADE_LABEL,
  StatusSala,
  STATUS_SALA_LABEL,
  type SalaTelemedicina,
} from '@/types';

function salaVariant(s: StatusSala): 'default' | 'success' | 'destructive' | 'secondary' {
  if (s === StatusSala.AGUARDANDO) return 'default';
  if (s === StatusSala.EM_ANDAMENTO) return 'success';
  if (s === StatusSala.EXPIRADA) return 'destructive';
  return 'secondary';
}

function SalaCard({ sala, onEncerrar, loading }: { sala: SalaTelemedicina; onEncerrar: () => void; loading: boolean }) {
  function copiar(token: string) {
    void navigator.clipboard.writeText(token);
    toast.success('Token copiado.');
  }

  const ativa = sala.status === StatusSala.AGUARDANDO || sala.status === StatusSala.EM_ANDAMENTO;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CardTitle>Sala de telemedicina</CardTitle>
          <Badge variant={salaVariant(sala.status as StatusSala)}>
            {STATUS_SALA_LABEL[sala.status as StatusSala] ?? sala.status}
          </Badge>
        </div>
        {ativa && (
          <Button variant="destructive" size="sm" disabled={loading} onClick={onEncerrar}>
            <PowerOff className="mr-2 h-4 w-4" /> Encerrar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Modalidade</p>
            <p className="font-medium">{MODALIDADE_LABEL[sala.modalidade as ModalidadeAtendimento] ?? sala.modalidade}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Criada em</p>
            <p className="font-medium">{dayjs(sala.criadoEm).format('DD/MM/YYYY HH:mm')}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Expira em</p>
            <p className="font-medium">{dayjs(sala.expiresAt).format('DD/MM/YYYY HH:mm')}</p>
          </div>
          {sala.iniciadaEm && (
            <div>
              <p className="text-muted-foreground text-xs">Iniciada em</p>
              <p className="font-medium">{dayjs(sala.iniciadaEm).format('DD/MM/YYYY HH:mm')}</p>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="glass rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Token do profissional</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-primary flex-1 truncate">{sala.tokenMedico.slice(0, 24)}…</code>
              <Button variant="ghost" size="icon" onClick={() => copiar(sala.tokenMedico)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="glass rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Token do paciente</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-emerald-600 flex-1 truncate">{sala.tokenPaciente.slice(0, 24)}…</code>
              <Button variant="ghost" size="icon" onClick={() => copiar(sala.tokenPaciente)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TelemedicinaPage() {
  const { user } = useAuth();
  const [openCreate, setOpenCreate] = useState(false);
  const [agendamentoId, setAgendamentoId] = useState('');
  const [buscarId, setBuscarId] = useState('');
  const [sala, setSala] = useState<SalaTelemedicina | null>(null);

  const [fAgId, setFAgId] = useState('');
  const [fPacId, setFPacId] = useState('');
  const [fModalidade, setFModalidade] = useState<ModalidadeAtendimento | ''>('');

  const buscarQ = useQuery({
    queryKey: ['telemedicina', 'sala', buscarId],
    queryFn: () => telemedicinaApi.findByAgendamento(buscarId),
    enabled: buscarId.length > 0,
    retry: false,
  });

  const createMut = useMutation({
    mutationFn: (payload: CreateSalaPayload) => telemedicinaApi.createSala(payload),
    onSuccess: (data) => {
      toast.success('Sala criada com sucesso.');
      setFAgId(''); setFPacId(''); setFModalidade('');
      setOpenCreate(false);
      setSala(data);
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const encerrarMut = useMutation({
    mutationFn: (id: string) => telemedicinaApi.encerrar(id),
    onSuccess: (data) => { toast.success('Sala encerrada.'); setSala(data as SalaTelemedicina); },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  function handleBuscar() {
    if (!agendamentoId.trim()) return;
    setSala(null);
    setBuscarId(agendamentoId.trim());
  }

  function handleCreate() {
    if (!user?.clinicaId || !fAgId || !fPacId || !fModalidade) { toast.error('Preencha todos os campos.'); return; }
    createMut.mutate({ clinicaId: user.clinicaId, agendamentoId: fAgId, pacienteId: fPacId, modalidade: fModalidade });
  }

  const salaExibida = sala ?? (buscarQ.data as SalaTelemedicina | undefined);

  return (
    <div className="p-6">
      <PageHeader
        title="Telemedicina"
        extra={
          <Button onClick={() => setOpenCreate(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova sala
          </Button>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Buscar sala por agendamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 max-w-md">
            <Input
              placeholder="ID do agendamento"
              value={agendamentoId}
              onChange={(e) => setAgendamentoId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBuscar()}
            />
            <Button variant="outline" onClick={handleBuscar} disabled={buscarQ.isFetching}>
              <Search className="h-4 w-4 mr-2" /> Buscar
            </Button>
          </div>

          {buscarQ.isError && (
            <p className="mt-3 text-sm text-amber-600">Nenhuma sala encontrada para este agendamento.</p>
          )}
        </CardContent>
      </Card>

      {salaExibida && (
        <SalaCard
          sala={salaExibida}
          onEncerrar={() => encerrarMut.mutate(salaExibida.id)}
          loading={encerrarMut.isPending}
        />
      )}

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova sala de telemedicina</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fAgId">ID do agendamento</Label>
              <Input id="fAgId" placeholder="ID do agendamento" value={fAgId} onChange={(e) => setFAgId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fPacId">ID do paciente</Label>
              <Input id="fPacId" placeholder="ID do paciente" value={fPacId} onChange={(e) => setFPacId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Modalidade</Label>
              <Select value={fModalidade} onValueChange={(v) => setFModalidade(v as ModalidadeAtendimento)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.values(ModalidadeAtendimento).map((m) => (
                    <SelectItem key={m} value={m}>{MODALIDADE_LABEL[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMut.isPending}>{createMut.isPending ? 'Criando...' : 'Criar sala'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
