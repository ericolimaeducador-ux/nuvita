import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Brain, CalendarPlus, ClipboardList, History, Loader2, PenLine, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/auth/AuthContext';
import { agendaApi, pacientesApi, prontuariosApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { formatData, formatEndereco, toItems } from '@/utils';
import {
  Agendamento, ModalidadeAtendimento, Paciente, Papel, Prontuario, RegistroPsicologico,
  StatusAgendamento, STATUS_AGENDAMENTO_LABEL, TipoAgendamento, TipoAtendimento,
  TIPO_AGENDAMENTO_LABEL, TIPOS_POR_MODALIDADE,
} from '@/types';

/**
 * Textarea que cresce conforme o texto — o psicólogo enxerga a anotação
 * inteira enquanto escreve, sem rolagem interna num campo pequeno.
 */
function AutoTextarea({
  value, onChange, placeholder, minRows = 3,
}: { value?: string; onChange: (v: string) => void; placeholder?: string; minRows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none overflow-hidden"
    />
  );
}

function CampoTexto({
  label, value, onChange, placeholder, minRows,
}: { label: string; value?: string; onChange: (v: string) => void; placeholder?: string; minRows?: number }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <AutoTextarea value={value} onChange={onChange} placeholder={placeholder} minRows={minRows} />
    </div>
  );
}

function SecaoTitulo({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-2">{children}</p>
      <Separator />
    </>
  );
}

/** Remove strings vazias/undefined antes de montar o payload. */
function limpar<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const saida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    saida[k] = v;
  }
  return saida as Partial<T>;
}

// ---------------------------------------------------------------------------
// Dialog: registro da sessão (Res. CFP 006/2019)
// ---------------------------------------------------------------------------

function RegistroSessaoDialog({
  agendamento, open, onClose,
}: { agendamento: Agendamento | null; open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reg, setReg] = useState<RegistroPsicologico>({});
  const set = (patch: Partial<RegistroPsicologico>) => setReg((r) => ({ ...r, ...patch }));

  useEffect(() => {
    if (open) setReg({ crp: user?.registroProfissional });
  }, [open, user?.registroProfissional]);

  const pacienteQ = useQuery({
    queryKey: ['paciente', agendamento?.pacienteId],
    queryFn: () => pacientesApi.get(agendamento!.pacienteId),
    enabled: open && !!agendamento?.pacienteId,
  });
  const paciente: Paciente | undefined = pacienteQ.data;

  const salvarM = useMutation({
    mutationFn: async (assinar: boolean) => {
      const prontuario = await prontuariosApi.create({
        clinicaId: user?.clinicaId,
        pacienteId: agendamento!.pacienteId,
        agendamentoId: agendamento!.id,
        dataAtendimento: new Date().toISOString(),
        tipo: TipoAtendimento.PSICOTERAPIA,
        registroPsicologico: limpar(reg as Record<string, unknown>),
      });
      if (assinar) await prontuariosApi.assinar(prontuario.id);
      return prontuario;
    },
    onSuccess: (_p, assinar) => {
      toast({ title: assinar ? 'Sessão registrada e assinada.' : 'Sessão registrada como rascunho.' });
      queryClient.invalidateQueries({ queryKey: ['agendamentos-psicologia'] });
      queryClient.invalidateQueries({ queryKey: ['sessoes-psicologia'] });
      onClose();
    },
    onError: (e) => toast({ title: 'Erro ao registrar sessão', description: apiErrorMessage(e), variant: 'destructive' }),
  });

  const salvar = (assinar: boolean) => {
    if (!reg.motivoAtendimento && !reg.evolucao && !reg.anotacoesLivres) {
      toast({ title: 'Preencha ao menos o motivo do atendimento, a evolução ou as anotações da sessão.', variant: 'destructive' });
      return;
    }
    salvarM.mutate(assinar);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !salvarM.isPending && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registro de atendimento psicológico</DialogTitle>
          <DialogDescription>
            Registro documental conforme a Resolução CFP nº 006/2019. Após assinado, o registro fica
            imutável — correções só por adendo.
          </DialogDescription>
        </DialogHeader>

        {/* Dados do paciente */}
        <div className="rounded-xl border p-4 space-y-1 text-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <User className="h-3.5 w-3.5" /> Paciente
          </p>
          {pacienteQ.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <>
              <p className="font-medium text-base">{paciente?.nome ?? agendamento?.pacienteNome ?? '—'}</p>
              <p className="text-muted-foreground">
                CPF: {paciente?.cpf ?? agendamento?.pacienteCpf ?? '—'} · Nascimento: {formatData(paciente?.dataNascimento)} · Sexo: {paciente?.sexo ?? '—'}
              </p>
              <p className="text-muted-foreground">
                Telefone: {paciente?.telefone ?? '—'}{paciente?.endereco ? ` · ${formatEndereco(paciente.endereco)}` : ''}
              </p>
            </>
          )}
        </div>

        <div className="space-y-4">
          <SecaoTitulo>Demanda</SecaoTitulo>
          <CampoTexto label="Motivo do atendimento / queixa principal" value={reg.motivoAtendimento} onChange={(v) => set({ motivoAtendimento: v })} />
          <CampoTexto label="Avaliação de demanda" value={reg.avaliacaoDemanda} onChange={(v) => set({ avaliacaoDemanda: v })} minRows={2} />

          <SecaoTitulo>Histórico de saúde</SecaoTitulo>
          <CampoTexto label="Doenças prévias / condições de saúde" value={reg.doencasPrevias} onChange={(v) => set({ doencasPrevias: v })} minRows={2} />
          <CampoTexto label="Diagnósticos de saúde mental (prévios ou atuais)" value={reg.diagnosticosSaudeMental} onChange={(v) => set({ diagnosticosSaudeMental: v })} minRows={2} />
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto label="Medicamentos em uso" value={reg.medicamentosEmUso} onChange={(v) => set({ medicamentosEmUso: v })} minRows={2} />
            <CampoTexto label="Histórico familiar de saúde mental" value={reg.historicoFamiliarSaudeMental} onChange={(v) => set({ historicoFamiliarSaudeMental: v })} minRows={2} />
          </div>

          <SecaoTitulo>Hábitos de vida</SecaoTitulo>
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoTexto label="Qualidade do sono" value={reg.qualidadeSono} onChange={(v) => set({ qualidadeSono: v })} minRows={2} />
            <CampoTexto label="Apetite / alimentação" value={reg.apetiteAlimentacao} onChange={(v) => set({ apetiteAlimentacao: v })} minRows={2} />
            <CampoTexto label="Atividade física" value={reg.atividadeFisica} onChange={(v) => set({ atividadeFisica: v })} minRows={2} />
            <CampoTexto label="Uso de álcool, tabaco e outras substâncias" value={reg.usoSubstancias} onChange={(v) => set({ usoSubstancias: v })} minRows={2} />
          </div>

          <SecaoTitulo>Estado na sessão</SecaoTitulo>
          <CampoTexto label="Estado emocional / sentimentos relatados e afeto observado" value={reg.estadoEmocional} onChange={(v) => set({ estadoEmocional: v })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Dor (0 a 10)</Label>
              <Input
                type="number" min={0} max={10} value={reg.escalaDor ?? ''}
                onChange={(e) => set({ escalaDor: e.target.value === '' ? undefined : Math.max(0, Math.min(10, Number(e.target.value))) })}
              />
            </div>
            <CampoTexto label="Rede de apoio familiar / social" value={reg.redeApoio} onChange={(v) => set({ redeApoio: v })} minRows={2} />
          </div>
          <CampoTexto label="Avaliação de risco (ideação suicida, autolesão, risco a terceiros)" value={reg.avaliacaoRisco} onChange={(v) => set({ avaliacaoRisco: v })} minRows={2} />

          <SecaoTitulo>Sessão</SecaoTitulo>
          <CampoTexto label="Objetivos do acompanhamento" value={reg.objetivosTrabalho} onChange={(v) => set({ objetivosTrabalho: v })} minRows={2} />
          <CampoTexto label="Procedimento / técnica utilizada" value={reg.procedimentoTecnica} onChange={(v) => set({ procedimentoTecnica: v })} minRows={2} />
          <CampoTexto label="Evolução" value={reg.evolucao} onChange={(v) => set({ evolucao: v })} />
          <CampoTexto label="Encaminhamentos" value={reg.encaminhamentos} onChange={(v) => set({ encaminhamentos: v })} minRows={2} />

          <SecaoTitulo>Anotações livres da sessão</SecaoTitulo>
          <AutoTextarea
            value={reg.anotacoesLivres}
            onChange={(v) => set({ anotacoesLivres: v })}
            placeholder="Anotações livres — o campo cresce conforme você escreve."
            minRows={8}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>CRP do psicólogo responsável</Label>
              <Input value={reg.crp ?? ''} onChange={(e) => set({ crp: e.target.value })} placeholder="CRP 00/00000" />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={salvarM.isPending}>Cancelar</Button>
          <Button variant="secondary" onClick={() => salvar(false)} disabled={salvarM.isPending}>
            {salvarM.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar rascunho
          </Button>
          <Button onClick={() => salvar(true)} disabled={salvarM.isPending}>
            {salvarM.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PenLine className="h-4 w-4 mr-2" />}
            Salvar e assinar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Dialog: histórico de sessões do paciente
// ---------------------------------------------------------------------------

const CAMPO_LABEL: Array<[keyof RegistroPsicologico, string]> = [
  ['motivoAtendimento', 'Motivo do atendimento'],
  ['avaliacaoDemanda', 'Avaliação de demanda'],
  ['doencasPrevias', 'Doenças prévias'],
  ['diagnosticosSaudeMental', 'Diagnósticos de saúde mental'],
  ['medicamentosEmUso', 'Medicamentos em uso'],
  ['historicoFamiliarSaudeMental', 'Histórico familiar de saúde mental'],
  ['qualidadeSono', 'Qualidade do sono'],
  ['apetiteAlimentacao', 'Apetite / alimentação'],
  ['atividadeFisica', 'Atividade física'],
  ['usoSubstancias', 'Uso de substâncias'],
  ['estadoEmocional', 'Estado emocional'],
  ['escalaDor', 'Dor (0-10)'],
  ['avaliacaoRisco', 'Avaliação de risco'],
  ['redeApoio', 'Rede de apoio'],
  ['objetivosTrabalho', 'Objetivos do acompanhamento'],
  ['procedimentoTecnica', 'Procedimento / técnica'],
  ['evolucao', 'Evolução'],
  ['encaminhamentos', 'Encaminhamentos'],
  ['anotacoesLivres', 'Anotações livres'],
  ['crp', 'CRP'],
];

function HistoricoSessoesDialog({
  pacienteId, pacienteNome, open, onClose,
}: { pacienteId: string | null; pacienteNome?: string; open: boolean; onClose: () => void }) {
  const [aberta, setAberta] = useState<string | null>(null);

  const sessoesQ = useQuery({
    queryKey: ['sessoes-psicologia', pacienteId],
    queryFn: () => prontuariosApi.list({ pacienteId: pacienteId! }),
    enabled: open && !!pacienteId,
  });
  const sessoes = toItems<Prontuario>(sessoesQ.data).filter((p) => p.tipo === TipoAtendimento.PSICOTERAPIA);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Histórico de sessões — {pacienteNome ?? 'paciente'}</DialogTitle>
          <DialogDescription>Registros de psicoterapia deste paciente, do mais recente ao mais antigo.</DialogDescription>
        </DialogHeader>
        {sessoesQ.isLoading ? (
          <div className="space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
        ) : sessoes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma sessão registrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {sessoes.map((s) => (
              <div key={s.id} className="rounded-xl border">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-2 p-3 text-left"
                  onClick={() => setAberta(aberta === s.id ? null : s.id)}
                >
                  <span className="text-sm font-medium">
                    {dayjs(s.dataAtendimento).format('DD/MM/YYYY HH:mm')}
                  </span>
                  {s.assinado ? (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">Assinado</Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-500/30">Rascunho</Badge>
                  )}
                </button>
                {aberta === s.id && (
                  <div className="border-t p-3 space-y-2 text-sm">
                    {CAMPO_LABEL.filter(([k]) => s.registroPsicologico?.[k] !== undefined && s.registroPsicologico?.[k] !== '').map(([k, label]) => (
                      <div key={k}>
                        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                        <p className="whitespace-pre-wrap">{String(s.registroPsicologico?.[k])}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Dialog: novo agendamento de psicologia
// ---------------------------------------------------------------------------

function NovoAgendamentoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const ehPsicologo = user?.papel === Papel.PSICOLOGO;

  const [busca, setBusca] = useState('');
  const [pacienteId, setPacienteId] = useState('');
  const [profissionalId, setProfissionalId] = useState('');
  const [tipo, setTipo] = useState<TipoAgendamento>(TipoAgendamento.AVALIACAO_PSICOLOGICA);
  const [inicio, setInicio] = useState('');
  const [duracaoMin, setDuracaoMin] = useState('50');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    if (open) {
      setBusca(''); setPacienteId(''); setObservacoes('');
      setTipo(TipoAgendamento.AVALIACAO_PSICOLOGICA);
      setInicio(dayjs().add(1, 'hour').startOf('hour').format('YYYY-MM-DDTHH:mm'));
      setDuracaoMin('50');
      setProfissionalId(ehPsicologo ? (user?.id ?? '') : '');
    }
  }, [open, ehPsicologo, user?.id]);

  const pacientesQ = useQuery({
    queryKey: ['pacientes-busca-psico', busca],
    queryFn: () => pacientesApi.list({ nome: busca || undefined, limit: 10 }),
    enabled: open,
  });
  const pacientes = toItems<Paciente>(pacientesQ.data);

  const criarM = useMutation({
    mutationFn: () =>
      agendaApi.create({
        clinicaId: user?.clinicaId ?? '',
        pacienteId,
        medicoId: profissionalId,
        modalidade: ModalidadeAtendimento.PSICOLOGIA,
        tipo,
        dataHoraInicio: dayjs(inicio).toISOString(),
        dataHoraFim: dayjs(inicio).add(Number(duracaoMin) || 50, 'minute').toISOString(),
        observacoes: observacoes || undefined,
      }),
    onSuccess: () => {
      toast({ title: 'Agendamento criado.' });
      queryClient.invalidateQueries({ queryKey: ['agendamentos-psicologia'] });
      onClose();
    },
    onError: (e) => toast({ title: 'Erro ao agendar', description: apiErrorMessage(e), variant: 'destructive' }),
  });

  const submeter = () => {
    if (!pacienteId) { toast({ title: 'Selecione o paciente.', variant: 'destructive' }); return; }
    if (!profissionalId) { toast({ title: 'Informe o profissional responsável.', variant: 'destructive' }); return; }
    if (!inicio) { toast({ title: 'Informe a data e hora.', variant: 'destructive' }); return; }
    criarM.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !criarM.isPending && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo agendamento psicológico</DialogTitle>
          <DialogDescription>Agende uma avaliação psicológica ou sessão de psicoterapia.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Paciente</Label>
            <Input placeholder="Buscar por nome…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <Select value={pacienteId} onValueChange={setPacienteId}>
              <SelectTrigger><SelectValue placeholder="Selecione o paciente" /></SelectTrigger>
              <SelectContent>
                {pacientes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nome}{p.cpf ? ` — ${p.cpf}` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!ehPsicologo && (
            <div className="space-y-2">
              <Label>ID do psicólogo responsável</Label>
              <Input value={profissionalId} onChange={(e) => setProfissionalId(e.target.value)} placeholder="ID do usuário psicólogo" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAgendamento)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS_POR_MODALIDADE[ModalidadeAtendimento.PSICOLOGIA].map((t) => (
                  <SelectItem key={t} value={t}>{TIPO_AGENDAMENTO_LABEL[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Data e hora</Label>
              <Input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Duração (min)</Label>
              <Input type="number" min={10} step={5} value={duracaoMin} onChange={(e) => setDuracaoMin(e.target.value)} />
            </div>
          </div>
          <CampoTexto label="Observações" value={observacoes} onChange={setObservacoes} minRows={2} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={criarM.isPending}>Cancelar</Button>
          <Button onClick={submeter} disabled={criarM.isPending}>
            {criarM.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Agendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

const STATUS_BADGE: Partial<Record<StatusAgendamento, string>> = {
  [StatusAgendamento.AGENDADO]: 'text-blue-600 border-blue-500/30',
  [StatusAgendamento.CONFIRMADO]: 'text-cyan-600 border-cyan-500/30',
  [StatusAgendamento.CONCLUIDO]: 'text-emerald-600 border-emerald-500/30',
  [StatusAgendamento.CANCELADO]: 'text-red-600 border-red-500/30',
  [StatusAgendamento.FALTA]: 'text-orange-600 border-orange-500/30',
};

export function AtendimentoPsicologicoPage() {
  const { user } = useAuth();
  const ehPsicologo = user?.papel === Papel.PSICOLOGO;

  const [status, setStatus] = useState<'ativos' | StatusAgendamento>('ativos');
  const [novoAberto, setNovoAberto] = useState(false);
  const [atendendo, setAtendendo] = useState<Agendamento | null>(null);
  const [historicoDe, setHistoricoDe] = useState<Agendamento | null>(null);

  const agendamentosQ = useQuery({
    queryKey: ['agendamentos-psicologia', ehPsicologo ? user?.id : 'todos'],
    queryFn: () =>
      agendaApi.list({
        modalidade: ModalidadeAtendimento.PSICOLOGIA,
        // Psicólogo vê a própria agenda; admin/secretária veem todos da clínica.
        medicoId: ehPsicologo ? user?.id : undefined,
      }),
  });

  const agendamentos = useMemo(() => {
    const itens = toItems<Agendamento>(agendamentosQ.data);
    const filtrados = status === 'ativos'
      ? itens.filter((a) => a.status === StatusAgendamento.AGENDADO || a.status === StatusAgendamento.CONFIRMADO)
      : itens.filter((a) => a.status === status);
    return [...filtrados].sort((a, b) => dayjs(a.dataHoraInicio).valueOf() - dayjs(b.dataHoraInicio).valueOf());
  }, [agendamentosQ.data, status]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Brain className="h-6 w-6" /> Atendimento Psicológico
          </h1>
          <p className="text-sm text-muted-foreground">
            Pacientes agendados para avaliação psicológica e psicoterapia — fora do fluxo clínico.
          </p>
        </div>
        <Button onClick={() => setNovoAberto(true)}>
          <CalendarPlus className="h-4 w-4 mr-2" /> Novo agendamento
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-sm text-muted-foreground">Mostrar:</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ativos">Agendados e confirmados</SelectItem>
            {Object.values(StatusAgendamento).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_AGENDAMENTO_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {agendamentosQ.isLoading ? (
        <div className="space-y-2"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
      ) : agendamentos.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Nenhum paciente agendado para o psicólogo neste filtro.
        </div>
      ) : (
        <div className="space-y-2">
          {agendamentos.map((a) => (
            <div key={a.id} className="rounded-xl border p-4 flex flex-wrap items-center gap-4">
              <div className="min-w-40">
                <p className="font-medium">{dayjs(a.dataHoraInicio).format('DD/MM/YYYY')}</p>
                <p className="text-sm text-muted-foreground">
                  {dayjs(a.dataHoraInicio).format('HH:mm')} – {dayjs(a.dataHoraFim).format('HH:mm')}
                </p>
              </div>
              <div className="flex-1 min-w-48">
                <Link to={`/pacientes/${a.pacienteId}`} className="font-medium hover:underline">
                  {a.pacienteNome ?? a.pacienteId}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {a.pacienteCpf ? `CPF ${a.pacienteCpf} · ` : ''}{TIPO_AGENDAMENTO_LABEL[a.tipo]}
                </p>
              </div>
              <Badge variant="outline" className={STATUS_BADGE[a.status]}>
                {STATUS_AGENDAMENTO_LABEL[a.status]}
              </Badge>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setHistoricoDe(a)}>
                  <History className="h-4 w-4 mr-2" /> Histórico
                </Button>
                {(a.status === StatusAgendamento.AGENDADO || a.status === StatusAgendamento.CONFIRMADO) && (
                  <Button size="sm" onClick={() => setAtendendo(a)}>
                    <ClipboardList className="h-4 w-4 mr-2" /> Atender
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <NovoAgendamentoDialog open={novoAberto} onClose={() => setNovoAberto(false)} />
      <RegistroSessaoDialog agendamento={atendendo} open={!!atendendo} onClose={() => setAtendendo(null)} />
      <HistoricoSessoesDialog
        pacienteId={historicoDe?.pacienteId ?? null}
        pacienteNome={historicoDe?.pacienteNome}
        open={!!historicoDe}
        onClose={() => setHistoricoDe(null)}
      />
    </div>
  );
}
