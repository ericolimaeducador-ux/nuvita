import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Plus, Search, Copy, PowerOff, Video, History } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { agendaApi, pacientesApi, telemedicinaApi, type CreateSalaPayload } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { toItems, formatCpf, linkDaSala } from '@/utils';
import {
  ModalidadeAtendimento,
  MODALIDADE_LABEL,
  PAPEL_SALA_LABEL,
  StatusAgendamento,
  StatusSala,
  STATUS_SALA_LABEL,
  TIPO_AGENDAMENTO_LABEL,
  TIPO_EVENTO_SALA_LABEL,
  TipoEventoSala,
  type Agendamento,
  type Paciente,
  type SalaEvento,
  type SalaTelemedicina,
} from '@/types';

function salaVariant(s: StatusSala): 'default' | 'success' | 'destructive' | 'secondary' {
  if (s === StatusSala.AGUARDANDO) return 'default';
  if (s === StatusSala.EM_ANDAMENTO) return 'success';
  if (s === StatusSala.EXPIRADA) return 'destructive';
  return 'secondary';
}

function duracaoAtendimento(sala: SalaTelemedicina): string | null {
  if (!sala.iniciadaEm || !sala.encerradaEm) return null;
  const minutos = dayjs(sala.encerradaEm).diff(dayjs(sala.iniciadaEm), 'minute');
  const segundos = dayjs(sala.encerradaEm).diff(dayjs(sala.iniciadaEm), 'second') % 60;
  return `${minutos}min ${segundos}s`;
}

function eventoVariant(tipo: TipoEventoSala): 'default' | 'success' | 'destructive' | 'secondary' {
  if (tipo === TipoEventoSala.ENTROU || tipo === TipoEventoSala.RECONECTOU) return 'success';
  if (tipo === TipoEventoSala.DESCONECTOU || tipo === TipoEventoSala.FALHA_CONEXAO || tipo === TipoEventoSala.MIDIA_NEGADA)
    return 'destructive';
  return 'secondary';
}

function SalaCard({
  sala,
  paciente,
  onEncerrar,
  loading,
}: {
  sala: SalaTelemedicina;
  paciente?: Paciente;
  onEncerrar: () => void;
  loading: boolean;
}) {
  function copiarLink(token: string, quem: string) {
    void navigator.clipboard.writeText(linkDaSala(token));
    toast.success(`Link do ${quem} copiado.`);
  }

  const ativa = sala.status === StatusSala.AGUARDANDO || sala.status === StatusSala.EM_ANDAMENTO;
  const duracao = duracaoAtendimento(sala);

  const eventosQ = useQuery({
    queryKey: ['telemedicina', 'eventos', sala.id],
    queryFn: () => telemedicinaApi.eventos(sala.id),
    refetchInterval: ativa ? 15_000 : false,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Sala de telemedicina</CardTitle>
            <Badge variant={salaVariant(sala.status as StatusSala)}>
              {STATUS_SALA_LABEL[sala.status as StatusSala] ?? sala.status}
            </Badge>
          </div>
          {paciente && (
            <p className="text-sm text-muted-foreground mt-1">
              {paciente.nome}
              {paciente.cpf && ` — CPF ${formatCpf(paciente.cpf)}`}
            </p>
          )}
        </div>
        {ativa && (
          <Button variant="destructive" size="sm" disabled={loading} onClick={onEncerrar}>
            <PowerOff className="mr-2 h-4 w-4" /> Encerrar
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
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
          {sala.encerradaEm && (
            <div>
              <p className="text-muted-foreground text-xs">Encerrada em</p>
              <p className="font-medium">{dayjs(sala.encerradaEm).format('DD/MM/YYYY HH:mm')}</p>
            </div>
          )}
          {duracao && (
            <div>
              <p className="text-muted-foreground text-xs">Duração</p>
              <p className="font-medium">{duracao}</p>
            </div>
          )}
        </div>

        {ativa && (
          <>
            <Separator />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" onClick={() => window.open(linkDaSala(sala.tokenMedico), '_blank')}>
                <Video className="mr-2 h-4 w-4" /> Entrar na sala (profissional)
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => copiarLink(sala.tokenPaciente, 'paciente')}
              >
                <Copy className="mr-2 h-4 w-4" /> Copiar link do paciente
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Envie o link ao paciente por WhatsApp ou e-mail — ele entra direto pelo navegador, sem login. O link
              expira em {dayjs(sala.expiresAt).format('HH:mm')}.
            </p>
          </>
        )}

        <Separator />

        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium mb-2">
            <History className="h-4 w-4" /> Registro do atendimento
          </p>
          {eventosQ.isLoading && <p className="text-sm text-muted-foreground">Carregando registro…</p>}
          {eventosQ.data && eventosQ.data.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum evento registrado ainda — o registro começa quando alguém entra na sala.</p>
          )}
          {eventosQ.data && eventosQ.data.length > 0 && (
            <ul className="space-y-1.5">
              {eventosQ.data.map((ev: SalaEvento) => (
                <li key={ev.id} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                    {dayjs(ev.criadoEm).format('DD/MM HH:mm:ss')}
                  </span>
                  <Badge variant={eventoVariant(ev.tipo)} className="font-normal">
                    {TIPO_EVENTO_SALA_LABEL[ev.tipo] ?? ev.tipo}
                  </Badge>
                  <span className="text-muted-foreground">{PAPEL_SALA_LABEL[ev.papel] ?? ev.papel}</span>
                  {ev.detalhes && <span className="text-xs text-muted-foreground truncate">— {ev.detalhes}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function HistoricoTelemedicina({
  salas,
  pacientePorId,
  onEncerrar,
  encerrarLoading,
}: {
  salas: SalaTelemedicina[];
  pacientePorId: Map<string, Paciente>;
  onEncerrar: (id: string) => void;
  encerrarLoading: boolean;
}) {
  const [dataSelecionada, setDataSelecionada] = useState<string | null>(null);
  const [salaSelecionadaId, setSalaSelecionadaId] = useState<string | null>(null);

  const porData = useMemo(() => {
    const grupos = new Map<string, SalaTelemedicina[]>();
    for (const s of salas) {
      const chave = dayjs(s.criadoEm).format('YYYY-MM-DD');
      const lista = grupos.get(chave) ?? [];
      lista.push(s);
      grupos.set(chave, lista);
    }
    return [...grupos.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [salas]);

  const salasDoDia = porData.find(([data]) => data === dataSelecionada)?.[1] ?? [];
  const salaSelecionada = salas.find((s) => s.id === salaSelecionadaId) ?? null;

  if (salas.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum atendimento registrado no período.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-[180px_220px_1fr]">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground mb-1">Datas</p>
        {porData.map(([data, lista]) => (
          <button
            key={data}
            type="button"
            onClick={() => { setDataSelecionada(data); setSalaSelecionadaId(null); }}
            className={`w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${dataSelecionada === data ? 'bg-muted font-medium' : ''}`}
          >
            {dayjs(data).format('DD/MM/YYYY')}
            <span className="ml-1.5 text-xs text-muted-foreground">({lista.length})</span>
          </button>
        ))}
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground mb-1">Pacientes</p>
        {!dataSelecionada && <p className="text-sm text-muted-foreground">Selecione uma data.</p>}
        {dataSelecionada && salasDoDia.map((s) => {
          const paciente = pacientePorId.get(s.pacienteId);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSalaSelecionadaId(s.id)}
              className={`w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${salaSelecionadaId === s.id ? 'bg-muted font-medium' : ''}`}
            >
              {paciente?.nome ?? s.pacienteId}
              <span className="block text-xs text-muted-foreground">{dayjs(s.criadoEm).format('HH:mm')} — {STATUS_SALA_LABEL[s.status as StatusSala] ?? s.status}</span>
            </button>
          );
        })}
      </div>

      <div>
        {!salaSelecionada && <p className="text-sm text-muted-foreground">Selecione um paciente para ver o registro do atendimento.</p>}
        {salaSelecionada && (
          <SalaCard
            sala={salaSelecionada}
            paciente={pacientePorId.get(salaSelecionada.pacienteId)}
            onEncerrar={() => onEncerrar(salaSelecionada.id)}
            loading={encerrarLoading}
          />
        )}
      </div>
    </div>
  );
}

export function TelemedicinaPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [openCreate, setOpenCreate] = useState(false);
  const [agendamentoId, setAgendamentoId] = useState('');
  const [buscarId, setBuscarId] = useState('');
  const [sala, setSala] = useState<SalaTelemedicina | null>(null);

  // Vindo do "Atender" do Atendimento Psicológico: a sala já foi criada lá,
  // aqui só abrimos ela direto (mesmo padrão do "iniciarAgendamento" em
  // PacienteDetailPage) — limpa o state pra não reabrir num refresh/voltar.
  useEffect(() => {
    const agId = (location.state as { agendamentoId?: string } | null)?.agendamentoId;
    if (!agId) return;
    setAgendamentoId(agId);
    setSala(null);
    setBuscarId(agId);
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const [fAgId, setFAgId] = useState('');
  const [fPacId, setFPacId] = useState('');
  const [fModalidade, setFModalidade] = useState<ModalidadeAtendimento | ''>('');

  const janelaInicio = useMemo(() => dayjs().subtract(30, 'day').startOf('day').toISOString(), []);
  const janelaFim = useMemo(() => dayjs().add(30, 'day').endOf('day').toISOString(), []);

  const agendamentosQ = useQuery({
    queryKey: ['agenda', 'telemedicina-select', janelaInicio, janelaFim],
    queryFn: () => agendaApi.list({ dataInicio: janelaInicio, dataFim: janelaFim }),
  });
  const pacientesQ = useQuery({ queryKey: ['pacientes', 'select'], queryFn: () => pacientesApi.list({ limit: 100 }) });

  const historicoInicio = useMemo(() => dayjs().subtract(90, 'day').startOf('day').toISOString(), []);
  const historicoFim = useMemo(() => dayjs().endOf('day').toISOString(), []);
  const historicoQ = useQuery({
    queryKey: ['telemedicina', 'historico', historicoInicio, historicoFim],
    queryFn: () => telemedicinaApi.listar({ dataInicio: historicoInicio, dataFim: historicoFim }),
  });

  const agendamentos = toItems<Agendamento>(agendamentosQ.data as never);
  const pacientes = toItems<Paciente>(pacientesQ.data as never);
  const pacientePorId = useMemo(() => new Map(pacientes.map((p) => [p.id, p])), [pacientes]);

  const agendamentosCriaveis = useMemo(
    () =>
      agendamentos.filter(
        (a) => a.status === StatusAgendamento.AGENDADO || a.status === StatusAgendamento.CONFIRMADO,
      ),
    [agendamentos],
  );

  function labelAgendamento(a: Agendamento): string {
    const nome = a.pacienteNome ?? pacientePorId.get(a.pacienteId)?.nome ?? a.pacienteId;
    return `${nome} — ${dayjs(a.dataHoraInicio).format('DD/MM HH:mm')} — ${TIPO_AGENDAMENTO_LABEL[a.tipo]}`;
  }

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
    onSuccess: (data) => {
      toast.success('Sala encerrada.');
      if (salaExibida?.id === data.id) setSala(data as SalaTelemedicina);
      void qc.invalidateQueries({ queryKey: ['telemedicina', 'historico'] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  function handleBuscar() {
    if (!agendamentoId) return;
    setSala(null);
    setBuscarId(agendamentoId);
  }

  function handleSelecionarAgendamento(id: string) {
    const ag = agendamentos.find((a) => a.id === id);
    setFAgId(id);
    setFPacId(ag?.pacienteId ?? '');
    if (ag) setFModalidade(ag.modalidade);
  }

  function handleCreate() {
    if (!user?.clinicaId || !fAgId || !fPacId || !fModalidade) { toast.error('Preencha todos os campos.'); return; }
    createMut.mutate({ clinicaId: user.clinicaId, agendamentoId: fAgId, pacienteId: fPacId, modalidade: fModalidade });
  }

  const salaExibida = sala ?? (buscarQ.data as SalaTelemedicina | undefined);
  const pacienteExibido = salaExibida ? pacientePorId.get(salaExibida.pacienteId) : undefined;

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
            <Select value={agendamentoId} onValueChange={setAgendamentoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o agendamento" />
              </SelectTrigger>
              <SelectContent>
                {agendamentos.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{labelAgendamento(a)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
        <div className="mb-6">
          <SalaCard
            sala={salaExibida}
            paciente={pacienteExibido}
            onEncerrar={() => encerrarMut.mutate(salaExibida.id)}
            loading={encerrarMut.isPending}
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" /> Histórico de atendimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historicoQ.isLoading && <p className="text-sm text-muted-foreground">Carregando histórico…</p>}
          {historicoQ.data && (
            <HistoricoTelemedicina
              salas={historicoQ.data}
              pacientePorId={pacientePorId}
              onEncerrar={(id) => encerrarMut.mutate(id)}
              encerrarLoading={encerrarMut.isPending}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova sala de telemedicina</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Agendamento</Label>
              <Select value={fAgId} onValueChange={handleSelecionarAgendamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o agendamento" />
                </SelectTrigger>
                <SelectContent>
                  {agendamentosCriaveis.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{labelAgendamento(a)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
