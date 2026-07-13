import { MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import dayjs from 'dayjs';
import { Brain, CalendarPlus, ClipboardList, Copy, History, Loader2, PenLine, User, Video, X } from 'lucide-react';
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
import { SalaVideo } from '@/components/SalaVideo';
import { useAuth } from '@/auth/AuthContext';
import { agendaApi, pacientesApi, prontuariosApi, psicoFinanceiroApi, telemedicinaApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { formatData, formatEndereco, linkDaSala, toItems } from '@/utils';
import {
  Agendamento, ModalidadeAtendimento, Paciente, Papel, Prontuario, RegistroPsicologico,
  REGISTRO_PSICOLOGICO_CAMPOS,
  SalaTelemedicina, StatusAgendamento, StatusSala, STATUS_AGENDAMENTO_LABEL,
  TipoAgendamento, TipoAtendimento,
  TIPO_AGENDAMENTO_LABEL, TIPOS_POR_MODALIDADE, rotuloProximaSessao,
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

/** Valor mais recente de um campo entre as sessões (medicamentos e diagnósticos mudam ao longo do acompanhamento). */
function ultimoValor(sessoes: Prontuario[], campo: keyof RegistroPsicologico): string | undefined {
  for (let i = sessoes.length - 1; i >= 0; i--) {
    const v = sessoes[i].registroPsicologico?.[campo];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return undefined;
}

function BlocoContexto({ label, valor }: { label: string; valor?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap">{valor?.trim() ? valor : <span className="text-muted-foreground">Não registrado.</span>}</p>
    </div>
  );
}

/**
 * Formulário de registro da sessão. Vive em dois lugares: no diálogo do botão
 * "Prontuário" e ao lado do vídeo, na tela de atendimento — por isso não traz
 * moldura própria.
 */
function RegistroSessao({
  agendamento, open, onClose, fecharRef,
}: {
  agendamento: Agendamento;
  /** Falso enquanto o diálogo está fechado — zera o formulário entre pacientes. */
  open: boolean;
  onClose: () => void;
  /** Recebe o fechar "guardado" (confirma se há anotação não salva) para o X e o ESC do diálogo. */
  fecharRef?: MutableRefObject<() => void>;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reg, setReg] = useState<RegistroPsicologico>({});
  const [forcarCompleto, setForcarCompleto] = useState(false);
  const [editandoContexto, setEditandoContexto] = useState(false);
  const set = (patch: Partial<RegistroPsicologico>) => setReg((r) => ({ ...r, ...patch }));

  useEffect(() => {
    if (!open) return;
    setReg({ crp: user?.registroProfissional });
    setForcarCompleto(false);
    setEditandoContexto(false);
  }, [open, user?.registroProfissional]);

  const pacienteQ = useQuery({
    queryKey: ['paciente', agendamento?.pacienteId],
    queryFn: () => pacientesApi.get(agendamento!.pacienteId),
    enabled: open && !!agendamento?.pacienteId,
  });
  const paciente: Paciente | undefined = pacienteQ.data;

  // As sessões já registradas definem o formulário: sem nenhuma, é a primeira
  // consulta (anamnese completa); com uma ou mais, é consulta de seguimento.
  const sessoesQ = useQuery({
    queryKey: ['sessoes-psicologia', agendamento?.pacienteId],
    queryFn: () => prontuariosApi.list({ pacienteId: agendamento!.pacienteId }),
    enabled: open && !!agendamento?.pacienteId,
  });
  const sessoes = useMemo(
    () => toItems<Prontuario>(sessoesQ.data)
      .filter((p) => p.tipo === TipoAtendimento.PSICOTERAPIA)
      .sort((a, b) => dayjs(a.dataAtendimento).valueOf() - dayjs(b.dataAtendimento).valueOf()),
    [sessoesQ.data],
  );
  const primeiraSessao = sessoes[0];
  const ultimaSessao = sessoes[sessoes.length - 1];

  const carregando = sessoesQ.isLoading || (open && !sessoesQ.data);
  const ehSeguimento = sessoes.length > 0;
  const completo = !ehSeguimento || forcarCompleto;

  // Queixa vem da PRIMEIRA consulta (é a demanda que trouxe o paciente);
  // medicamentos e diagnósticos, do registro mais recente que os informou.
  const queixaPrimaria = primeiraSessao?.registroPsicologico?.motivoAtendimento;
  const medicamentos = ultimoValor(sessoes, 'medicamentosEmUso');
  const diagnosticos = ultimoValor(sessoes, 'diagnosticosSaudeMental');

  // No formulário completo os campos estáveis vêm preenchidos da última sessão.
  useEffect(() => {
    if (!open || !completo || !ultimaSessao) return;
    const anterior = ultimaSessao.registroPsicologico ?? {};
    setReg((r) => ({
      ...r,
      motivoAtendimento: r.motivoAtendimento ?? queixaPrimaria,
      doencasPrevias: r.doencasPrevias ?? anterior.doencasPrevias,
      diagnosticosSaudeMental: r.diagnosticosSaudeMental ?? diagnosticos,
      medicamentosEmUso: r.medicamentosEmUso ?? medicamentos,
      historicoFamiliarSaudeMental: r.historicoFamiliarSaudeMental ?? anterior.historicoFamiliarSaudeMental,
      redeApoio: r.redeApoio ?? anterior.redeApoio,
      objetivosTrabalho: r.objetivosTrabalho ?? anterior.objetivosTrabalho,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, completo, ultimaSessao?.id]);

  function atualizarContexto() {
    set({ medicamentosEmUso: reg.medicamentosEmUso ?? medicamentos, diagnosticosSaudeMental: reg.diagnosticosSaudeMental ?? diagnosticos });
    setEditandoContexto(true);
  }

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
      // A sessão que acabou de entrar muda a numeração e pode fechar o ciclo.
      queryClient.invalidateQueries({ queryKey: ['painel-psicologia'] });
      onClose();
    },
    onError: (e) => toast({ title: 'Erro ao registrar sessão', description: apiErrorMessage(e), variant: 'destructive' }),
  });

  const salvar = (assinar: boolean) => {
    if (completo && !reg.motivoAtendimento && !reg.evolucao && !reg.anotacoesLivres) {
      toast({ title: 'Preencha ao menos o motivo do atendimento, a evolução ou as anotações da sessão.', variant: 'destructive' });
      return;
    }
    if (!completo && !reg.anotacoesLivres?.trim()) {
      toast({ title: 'Escreva as anotações da sessão antes de salvar.', variant: 'destructive' });
      return;
    }
    salvarM.mutate(assinar);
  };

  /** Um formulário aberto durante a consulta não pode fechar por um clique fora ou um ESC distraído. */
  const temConteudo = Object.entries(reg).some(([k, v]) => k !== 'crp' && v !== undefined && v !== '');
  function fechar() {
    if (salvarM.isPending) return;
    if (temConteudo && !window.confirm('As anotações desta sessão ainda não foram salvas. Fechar mesmo assim?')) return;
    onClose();
  }

  useEffect(() => {
    if (fecharRef) fecharRef.current = fechar;
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {carregando ? 'Carregando o histórico do paciente…'
          : completo
            ? `${ehSeguimento ? 'Prontuário completo' : 'Primeira consulta'} — anamnese psicológica. Registro documental conforme a Resolução CFP nº 006/2019: após assinado, fica imutável (correções só por adendo).`
            : `Consulta de seguimento — ${sessoes.length + 1}ª sessão. Contexto da primeira consulta e anotações livres da psicoterapia.`}
      </p>

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

      {carregando ? (
          <div className="space-y-2 py-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !completo ? (
          /* ---------------- Consulta de seguimento ---------------- */
          <div className="space-y-4">
            <div className="rounded-xl border border-dashed bg-muted/30 p-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Contexto do acompanhamento — {sessoes.length} {sessoes.length === 1 ? 'sessão registrada' : 'sessões registradas'}
                </p>
                {!editandoContexto && (
                  <Button variant="ghost" size="sm" onClick={atualizarContexto}>
                    <PenLine className="h-3.5 w-3.5 mr-2" /> Atualizar
                  </Button>
                )}
              </div>

              <BlocoContexto
                label={`Queixa principal (1ª consulta — ${dayjs(primeiraSessao.dataAtendimento).format('DD/MM/YYYY')})`}
                valor={queixaPrimaria}
              />

              {editandoContexto ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <CampoTexto label="Diagnósticos de saúde mental" value={reg.diagnosticosSaudeMental} onChange={(v) => set({ diagnosticosSaudeMental: v })} minRows={2} />
                  <CampoTexto label="Medicamentos em uso" value={reg.medicamentosEmUso} onChange={(v) => set({ medicamentosEmUso: v })} minRows={2} />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <BlocoContexto label="Diagnósticos de saúde mental" valor={diagnosticos} />
                  <BlocoContexto label="Medicamentos em uso" valor={medicamentos} />
                </div>
              )}

              {editandoContexto && (
                <p className="text-xs text-muted-foreground">
                  O que você registrar aqui passa a valer como o mais recente nas próximas sessões.
                </p>
              )}
            </div>

            {ultimaSessao && (ultimaSessao.registroPsicologico?.evolucao || ultimaSessao.registroPsicologico?.anotacoesLivres) && (
              <div className="rounded-xl border border-dashed p-4 space-y-1 text-sm bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Última sessão — {dayjs(ultimaSessao.dataAtendimento).format('DD/MM/YYYY')}
                </p>
                <p className="text-muted-foreground whitespace-pre-wrap line-clamp-3">
                  {ultimaSessao.registroPsicologico?.evolucao || ultimaSessao.registroPsicologico?.anotacoesLivres}
                </p>
              </div>
            )}

            <SecaoTitulo>Anotações da psicoterapia</SecaoTitulo>
            <AutoTextarea
              value={reg.anotacoesLivres}
              onChange={(v) => set({ anotacoesLivres: v })}
              placeholder="Registro livre da sessão — o campo cresce conforme você escreve."
              minRows={14}
            />

            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-2">
                <Label>CRP do psicólogo responsável</Label>
                <Input value={reg.crp ?? ''} onChange={(e) => set({ crp: e.target.value })} placeholder="CRP 00/00000" />
              </div>
              <Button variant="ghost" size="sm" onClick={() => setForcarCompleto(true)}>
                <ClipboardList className="h-4 w-4 mr-2" /> Abrir prontuário completo
              </Button>
            </div>
          </div>
        ) : (
          /* ---------------- Primeira consulta / prontuário completo ---------------- */
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
        )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={fechar} disabled={salvarM.isPending}>Fechar</Button>
        <Button variant="secondary" onClick={() => salvar(false)} disabled={salvarM.isPending || carregando}>
          {salvarM.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar rascunho
        </Button>
        <Button onClick={() => salvar(true)} disabled={salvarM.isPending || carregando}>
          {salvarM.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PenLine className="h-4 w-4 mr-2" />}
          Salvar e assinar
        </Button>
      </div>
    </div>
  );
}

/** O mesmo formulário, aberto pelo botão "Prontuário" — sem vídeo, para registrar depois. */
function RegistroSessaoDialog({
  agendamento, open, onClose,
}: { agendamento: Agendamento | null; open: boolean; onClose: () => void }) {
  // Fechar por clique fora ou ESC no meio de uma anotação é perda de trabalho:
  // ambos passam pelo fechar do formulário, que confirma antes de descartar.
  const fechar = useRef<() => void>(() => onClose());

  return (
    <Dialog open={open} onOpenChange={(v) => !v && fechar.current()}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Registro de atendimento psicológico</DialogTitle>
          <DialogDescription className="sr-only">
            Formulário de registro da sessão de psicoterapia.
          </DialogDescription>
        </DialogHeader>
        {agendamento && (
          <RegistroSessao agendamento={agendamento} open={open} onClose={onClose} fecharRef={fechar} />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Tela de atendimento: vídeo do paciente e prontuário lado a lado
// ---------------------------------------------------------------------------

function SessaoAtendimento({
  agendamento, sala, onSair,
}: { agendamento: Agendamento; sala: SalaTelemedicina; onSair: () => void }) {
  const fechar = useRef<() => void>(() => onSair());

  function copiarLinkPaciente() {
    void navigator.clipboard.writeText(linkDaSala(sala.tokenPaciente));
    toast({ title: 'Link do paciente copiado.', description: 'Envie por WhatsApp ou e-mail — o paciente entra sem login.' });
  }

  // Ocupa a janela inteira: durante a consulta a tela é do atendimento, e o
  // psicólogo escreve no prontuário sem tirar o paciente da vista.
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <div className="flex-1 min-w-48">
          <p className="font-medium flex items-center gap-2">
            <Brain className="h-4 w-4" /> {agendamento.pacienteNome ?? 'Atendimento psicológico'}
          </p>
          <p className="text-xs text-muted-foreground">
            {TIPO_AGENDAMENTO_LABEL[agendamento.tipo]} · {dayjs(agendamento.dataHoraInicio).format('DD/MM/YYYY HH:mm')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={copiarLinkPaciente}>
          <Copy className="h-4 w-4 mr-2" /> Copiar link do paciente
        </Button>
        <Button variant="ghost" size="sm" onClick={() => fechar.current()}>
          <X className="h-4 w-4 mr-2" /> Sair do atendimento
        </Button>
      </div>

      <div className="flex-1 grid gap-4 overflow-hidden p-4 lg:grid-cols-2">
        <div className="min-h-64 overflow-hidden rounded-xl border">
          <SalaVideo token={sala.tokenMedico} embutido />
        </div>
        <div className="overflow-y-auto rounded-xl border p-4">
          <RegistroSessao agendamento={agendamento} open onClose={onSair} fecharRef={fechar} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dialog: histórico de sessões do paciente
// ---------------------------------------------------------------------------

const CAMPO_LABEL = REGISTRO_PSICOLOGICO_CAMPOS;

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
  const [registroDe, setRegistroDe] = useState<Agendamento | null>(null);
  const [historicoDe, setHistoricoDe] = useState<Agendamento | null>(null);
  const [salaCarregandoId, setSalaCarregandoId] = useState<string | null>(null);
  const [sessao, setSessao] = useState<{ agendamento: Agendamento; sala: SalaTelemedicina } | null>(null);

  // Atendimento é 100% online por ora: "Atender" cria (ou reaproveita) a sala do
  // agendamento e abre a tela de sessão — vídeo e prontuário na mesma janela,
  // para o psicólogo tomar notas sem perder o paciente de vista.
  const atenderMut = useMutation({
    mutationFn: async (a: Agendamento) => {
      let sala: SalaTelemedicina | null = null;
      try {
        sala = await telemedicinaApi.findByAgendamento(a.id);
      } catch (e) {
        if (!axios.isAxiosError(e) || e.response?.status !== 404) throw e;
      }
      // Sala encerrada/expirada não aceita mais ninguém: abre uma nova.
      if (!sala || sala.status === StatusSala.ENCERRADA || sala.status === StatusSala.EXPIRADA) {
        sala = await telemedicinaApi.createSala({
          clinicaId: user?.clinicaId ?? '',
          agendamentoId: a.id,
          pacienteId: a.pacienteId,
          modalidade: ModalidadeAtendimento.PSICOLOGIA,
        });
      }
      return { agendamento: a, sala };
    },
    onSuccess: ({ agendamento, sala }) => {
      setSalaCarregandoId(null);
      setSessao({ agendamento, sala });
    },
    onError: (e) => {
      setSalaCarregandoId(null);
      toast({ title: 'Erro ao abrir a sala de telemedicina', description: apiErrorMessage(e), variant: 'destructive' });
    },
  });

  function atender(a: Agendamento) {
    setSalaCarregandoId(a.id);
    atenderMut.mutate(a);
  }

  // Em que sessão cada paciente está — vem do mesmo painel do financeiro, então
  // a numeração aqui e a cobrança lá nunca divergem. Paciente ausente do painel
  // é paciente sem sessão: é a primeira consulta dele.
  const painelQ = useQuery({
    queryKey: ['painel-psicologia'],
    queryFn: () => psicoFinanceiroApi.painel(),
    retry: false,
  });
  const situacaoPorPaciente = useMemo(
    () => new Map((painelQ.data?.pacientes ?? []).map((p) => [p.pacienteId, p])),
    [painelQ.data],
  );

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

  if (sessao) {
    return (
      <SessaoAtendimento
        agendamento={sessao.agendamento}
        sala={sessao.sala}
        onSair={() => setSessao(null)}
      />
    );
  }

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
          {agendamentos.map((a) => {
            const situacao = situacaoPorPaciente.get(a.pacienteId);
            return (
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
              <div className="text-sm">
                <p className="font-medium">
                  {situacao ? rotuloProximaSessao(situacao) : '1ª consulta'}
                </p>
                {situacao && situacao.sessoesRealizadas > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Ciclo {situacao.cicloAtual} · {situacao.sessoesNoCiclo}/{painelQ.data?.sessoesPorCiclo ?? 4} sessões
                  </p>
                )}
              </div>
              <Badge variant="outline" className={STATUS_BADGE[a.status]}>
                {STATUS_AGENDAMENTO_LABEL[a.status]}
              </Badge>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setHistoricoDe(a)}>
                  <History className="h-4 w-4 mr-2" /> Histórico
                </Button>
                {(a.status === StatusAgendamento.AGENDADO || a.status === StatusAgendamento.CONFIRMADO) && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setRegistroDe(a)}>
                      <ClipboardList className="h-4 w-4 mr-2" /> Prontuário
                    </Button>
                    <Button size="sm" disabled={salaCarregandoId === a.id} onClick={() => atender(a)}>
                      {salaCarregandoId === a.id
                        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        : <Video className="h-4 w-4 mr-2" />}
                      Atender
                    </Button>
                  </>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      <NovoAgendamentoDialog open={novoAberto} onClose={() => setNovoAberto(false)} />
      <RegistroSessaoDialog agendamento={registroDe} open={!!registroDe} onClose={() => setRegistroDe(null)} />
      <HistoricoSessoesDialog
        pacienteId={historicoDe?.pacienteId ?? null}
        pacienteNome={historicoDe?.pacienteNome}
        open={!!historicoDe}
        onClose={() => setHistoricoDe(null)}
      />
    </div>
  );
}
