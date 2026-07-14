import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import dayjs from 'dayjs';
import {
  ArrowLeft, ClipboardList, UserCheck, Stethoscope, Scale, Package,
  Plus, CheckCircle2, Clock, ChevronDown, ChevronUp, Printer, CalendarClock, FileText, Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  pacientesApi, avaliacaoIUApi, followUpApi, laudoMedicoApi,
  processoJuridicoApi, entregasApi, produtosApi, agendaApi, checklistDocumentosApi,
} from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/auth/AuthContext';
import { cn } from '@/lib/utils';
import { NovaAvaliacaoIUDialog, NovoLaudoDialog, ConfirmExcluirDialog } from '@/components/FluxoClinicoDialogs';
import { formatData, toItems } from '@/utils';
import {
  Papel, LocalAtendimento, PerfilCliente, Destreza, TipoIU, EncaminhamentoIU,
  StatusElegibilidade, StatusProcesso, OrigemEntrega,
  LOCAL_LABEL, PERFIL_LABEL, DESTREZA_LABEL, TIPO_IU_LABEL, ENCAMINHAMENTO_LABEL,
  STATUS_ELEGIBILIDADE_LABEL, STATUS_PROCESSO_LABEL, ORIGEM_ENTREGA_LABEL,
  EtapaFluxoClinico, ETAPA_FLUXO_LABEL, calcularPrazoEtapa, PROXIMA_ETAPA_MANUAL, PAPEIS_AVANCO_MANUAL,
  ModalidadeAtendimento, TipoAgendamento, StatusAgendamento, STATUS_AGENDAMENTO_LABEL,
  StatusChecklistDocumento, STATUS_CHECKLIST_DOCUMENTO_LABEL,
  StatusLaudoMedico, STATUS_LAUDO_MEDICO_LABEL,
  type AvaliacaoIU, type FollowUp, type LaudoMedico, type ProcessoJuridico, type Entrega, type Produto,
  type Agendamento, type ChecklistDocumentoItem,
} from '@/types';

export function FluxoPacientePage() {
  const { id: pacienteId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const pacienteQ = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => pacientesApi.get(pacienteId!),
    enabled: !!pacienteId,
  });
  const avaliacoesQ = useQuery({
    queryKey: ['avaliacao-iu', pacienteId],
    queryFn: () => avaliacaoIUApi.listByPaciente(pacienteId!),
    enabled: !!pacienteId,
  });
  const followupsQ = useQuery({
    queryKey: ['followup', pacienteId],
    queryFn: () => followUpApi.listByPaciente(pacienteId!),
    enabled: !!pacienteId,
  });
  const laudosQ = useQuery({
    queryKey: ['laudo-medico', pacienteId],
    queryFn: () => laudoMedicoApi.listByPaciente(pacienteId!),
    enabled: !!pacienteId,
  });
  const processosQ = useQuery({
    queryKey: ['processo-juridico', pacienteId],
    queryFn: () => processoJuridicoApi.listByPaciente(pacienteId!),
    enabled: !!pacienteId,
  });
  const entregasQ = useQuery({
    queryKey: ['entregas', pacienteId],
    queryFn: () => entregasApi.listByPaciente(pacienteId!),
    enabled: !!pacienteId,
  });
  const produtosQ = useQuery({
    queryKey: ['produtos'],
    queryFn: () => produtosApi.list(),
  });

  const paciente = pacienteQ.data;
  const avaliacoes = avaliacoesQ.data ?? [];
  const followups = followupsQ.data ?? [];
  const laudos = laudosQ.data ?? [];
  const processos = processosQ.data ?? [];
  const entregas = entregasQ.data ?? [];
  const produtos = (produtosQ.data ?? []).filter((p) => p.projeto === paciente?.projeto);

  if (pacienteQ.isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/fluxo-clinico')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={paciente?.nome ?? 'Paciente'}
          subtitle={`CPF: ${paciente?.cpf ?? '—'} · Fluxo clínico de incontinência urinária`}
        />
        <ProgramaIUToggle pacienteId={pacienteId!} programaIU={!!paciente?.programaIU} />
      </div>

      {paciente?.etapaFluxo && (
        <EtapaFluxoHeader paciente={paciente} pacienteId={pacienteId!} papel={user?.papel} />
      )}

      <div className="space-y-4">
        {/* Passo 1: Avaliação IU */}
        <Passo
          numero={1}
          titulo="Avaliação de Incontinência Urinária"
          subtitulo="Ficha de avaliação — preenchida pelo enfermeiro ou médico na consulta"
          icon={ClipboardList}
          concluido={avaliacoes.length > 0}
          visivel={user?.papel === Papel.ENFERMEIRO || user?.papel === Papel.MEDICO || user?.papel === Papel.ADMIN || !!avaliacoes.length}
        >
          <AvaliacaoIUStep
            pacienteId={pacienteId!}
            avaliacoes={avaliacoes}
            produtos={produtos}
            user={user}
          />
        </Passo>

        {/* Passo 2: Follow-up */}
        <Passo
          numero={2}
          titulo="Follow-up de Elegibilidade"
          subtitulo="Acompanhamento do enfermeiro durante uso do produto"
          icon={UserCheck}
          concluido={followups[0]?.statusElegibilidade === StatusElegibilidade.ELEGIVEL}
          visivel={avaliacoes.length > 0}
        >
          <FollowUpStep
            pacienteId={pacienteId!}
            avaliacaoId={avaliacoes[0]?.id}
            followups={followups}
            user={user}
          />
        </Passo>

        {/* Passo 3: Entrevista */}
        <Passo
          numero={3}
          titulo="Entrevista"
          subtitulo="Secretária agenda e conduz a entrevista com o paciente elegível"
          icon={CalendarClock}
          concluido={false}
          visivel={followups[0]?.statusElegibilidade === StatusElegibilidade.ELEGIVEL}
        >
          <EntrevistaStep pacienteId={pacienteId!} user={user} />
        </Passo>

        {/* Passo 4: Documentação */}
        <Passo
          numero={4}
          titulo="Documentação"
          subtitulo="Checklist de documentos para a judicialização"
          icon={FileText}
          concluido={false}
          visivel={followups[0]?.statusElegibilidade === StatusElegibilidade.ELEGIVEL}
        >
          <DocumentacaoStep pacienteId={pacienteId!} user={user} />
        </Passo>

        {/* Passo 5: Laudo Médico */}
        <Passo
          numero={5}
          titulo="Laudo Médico"
          subtitulo="Justificativa médica para solicitação ao SUS"
          icon={Stethoscope}
          concluido={laudos.some((l) => !!l.assinado)}
          visivel={followups[0]?.statusElegibilidade === StatusElegibilidade.ELEGIVEL}
        >
          <LaudoMedicoStep
            pacienteId={pacienteId!}
            avaliacaoId={avaliacoes[0]?.id}
            produtoIndicado={avaliacoes[0]?.produtoIndicado}
            laudos={laudos}
            produtos={produtos}
            user={user}
            clinicaId={user?.clinicaId}
          />
        </Passo>

        {/* Passo 6: Processo Jurídico */}
        <Passo
          numero={6}
          titulo="Processo Jurídico"
          subtitulo="Advogado monta e acompanha o processo judicial"
          icon={Scale}
          concluido={processos.some((p) => p.status === StatusProcesso.GANHO)}
          visivel={laudos.some((l) => !!l.assinado)}
        >
          <ProcessoJuridicoStep
            pacienteId={pacienteId!}
            avaliacaoId={avaliacoes[0]?.id}
            laudoId={laudos[0]?.id}
            processos={processos}
            user={user}
          />
        </Passo>

        {/* Passo 7: Entregas */}
        <Passo
          numero={7}
          titulo="Entregas"
          subtitulo="Registro de produtos enviados ao paciente"
          icon={Package}
          concluido={entregas.some((e) => e.status === 'entregue')}
          visivel={processos.length > 0 || laudos.length > 0}
        >
          <EntregasStep
            pacienteId={pacienteId!}
            processoId={processos[0]?.id}
            avaliacaoId={avaliacoes[0]?.id}
            entregas={entregas}
            produtos={produtos}
            user={user}
          />
        </Passo>
      </div>
    </div>
  );
}

// ---- Componente de passo ----
function Passo({
  numero, titulo, subtitulo, icon: Icon, concluido, visivel, children,
}: {
  numero: number; titulo: string; subtitulo: string; icon: React.ElementType;
  concluido: boolean; visivel: boolean; children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(numero === 1);
  if (!visivel) return null;

  return (
    <Card className={cn('border', concluido ? 'border-emerald-500/30' : 'border-border')}>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setAberto(!aberto)}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shrink-0',
            concluido ? 'bg-emerald-500/20 text-emerald-600' : 'bg-primary/10 text-primary'
          )}>
            {concluido ? <CheckCircle2 className="h-4 w-4" /> : numero}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">{titulo}</CardTitle>
              {concluido && <Badge variant="success" className="text-xs">Concluído</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{subtitulo}</p>
          </div>
          {aberto ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      {aberto && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

// ---- Passo 1: Avaliação IU ----
function AvaliacaoIUStep({ pacienteId, avaliacoes, produtos, user }: {
  pacienteId: string; avaliacoes: AvaliacaoIU[]; produtos: Produto[]; user: ReturnType<typeof useAuth>['user'];
}) {
  const [open, setOpen] = useState(false);
  const [editAv, setEditAv] = useState<AvaliacaoIU | null>(null);
  const [avParaExcluir, setAvParaExcluir] = useState<AvaliacaoIU | null>(null);
  const qc = useQueryClient();
  const { register, handleSubmit, setValue, watch, reset } = useForm<Record<string, unknown>>();

  const mut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => avaliacaoIUApi.create(payload),
    onSuccess: () => {
      toast.success('Avaliação registrada.');
      setOpen(false); reset();
      void qc.invalidateQueries({ queryKey: ['avaliacao-iu', pacienteId] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const excluirMut = useMutation({
    mutationFn: (avId: string) => avaliacaoIUApi.excluir(avId),
    onSuccess: () => {
      toast.success('Avaliação excluída.');
      setAvParaExcluir(null);
      void qc.invalidateQueries({ queryKey: ['avaliacao-iu', pacienteId] });
    },
    onError: (e) => toast.error('Erro ao excluir', apiErrorMessage(e)),
  });

  const tiposIU = (watch('tiposIU') as TipoIU[] | undefined) ?? [];

  function toggleTipoIU(tipo: TipoIU) {
    const atual = tiposIU.includes(tipo) ? tiposIU.filter((t) => t !== tipo) : [...tiposIU, tipo];
    setValue('tiposIU', atual);
  }

  function onSubmit(v: Record<string, unknown>) {
    mut.mutate({
      ...v,
      pacienteId,
      clinicaId: user?.clinicaId,
      tiposIU: tiposIU,
      dntui: !!v.dntui,
      miccaoEspontanea: !!v.miccaoEspontanea,
      realizaCateterismo: !!v.realizaCateterismo,
      emTratamento: !!v.emTratamento,
      autorizaPesquisa: !!v.autorizaPesquisa,
      aceitaInformacoes: !!v.aceitaInformacoes,
    });
  }

  const podeNovo = user?.papel === Papel.ENFERMEIRO || user?.papel === Papel.MEDICO || user?.papel === Papel.ADMIN;

  return (
    <div className="space-y-3">
      {avaliacoes.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhuma avaliação registrada ainda.</p>
      )}
      {avaliacoes.map((av) => (
        <div key={av.id} className="rounded-lg border border-border bg-muted/40 p-4 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{formatData(av.dataAtendimento)}</span>
            <Badge variant="outline" className="text-xs">{PERFIL_LABEL[av.perfilCliente]}</Badge>
            {av.encaminhamento && <Badge variant="outline" className="text-xs">{ENCAMINHAMENTO_LABEL[av.encaminhamento]}</Badge>}
            <div className="ml-auto flex items-center gap-1">
              {podeNovo && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => setEditAv(av)}>
                  Editar
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => window.open(`/fluxo-clinico/${pacienteId}/avaliacao/${av.id}/imprimir`, '_blank')}>
                <Printer className="h-3 w-3 mr-1" /> Imprimir ficha
              </Button>
              {podeNovo && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => setAvParaExcluir(av)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Motivo: {av.motivoIU}</p>
          {av.produtoIndicado && (
            <p className="text-xs text-primary">
              Produto indicado: Cód. {av.produtoIndicado.codigo} — {av.produtoIndicado.sexo} {av.produtoIndicado.french}Fr
            </p>
          )}
          {av.outrasIntercorrencias && (
            <p className="text-xs text-muted-foreground">Intercorrências: {av.outrasIntercorrencias}</p>
          )}
        </div>
      ))}

      {podeNovo && (
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nova avaliação
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ficha de Avaliação — Incontinência Urinária</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Data do atendimento</Label>
                <Input type="date" {...register('dataAtendimento', { required: true })} />
              </div>
              <div className="space-y-1">
                <Label>Local</Label>
                <Select onValueChange={(v) => setValue('local', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {Object.values(LocalAtendimento).map((l) => (
                      <SelectItem key={l} value={l}>{LOCAL_LABEL[l]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Plano de saúde</Label>
                <Input placeholder="Ex: SUS" {...register('planoSaude')} />
              </div>
              <div className="space-y-1">
                <Label>Hospital referência</Label>
                <Input {...register('hospitalReferencia')} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Motivo da IU / Diagnóstico</Label>
              <Input placeholder="Ex: LM T3-T4 pós cirurgia" {...register('motivoIU', { required: true })} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Perfil do cliente</Label>
                <Select onValueChange={(v) => setValue('perfilCliente', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {Object.values(PerfilCliente).map((p) => (
                      <SelectItem key={p} value={p}>{PERFIL_LABEL[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Destreza</Label>
                <Select onValueChange={(v) => setValue('destreza', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {Object.values(Destreza).map((d) => (
                      <SelectItem key={d} value={d}>{DESTREZA_LABEL[d]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Início dos sintomas</Label>
                <Input placeholder="Ex: Junho 2025" {...register('inicioSintomas')} />
              </div>
            </div>

            {/* Tipos de IU */}
            <div className="space-y-2">
              <Label>Tipo de IU (marque todos aplicáveis)</Label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(TipoIU).map((tipo) => (
                  <div key={tipo} className="flex items-center gap-2">
                    <Checkbox
                      id={tipo}
                      checked={tiposIU.includes(tipo)}
                      onCheckedChange={() => toggleTipoIU(tipo)}
                    />
                    <Label htmlFor={tipo} className="text-sm cursor-pointer">{TIPO_IU_LABEL[tipo]}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Checkbox id="miccao" onCheckedChange={(c) => setValue('miccaoEspontanea', !!c)} />
                <Label htmlFor="miccao" className="cursor-pointer">Micção espontânea</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="cateterismo" onCheckedChange={(c) => setValue('realizaCateterismo', !!c)} />
                <Label htmlFor="cateterismo" className="cursor-pointer">Realiza cateterismo</Label>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Cateterismos/dia</Label>
                <Input type="number" {...register('cateterismosDia', { valueAsNumber: true })} />
              </div>
              <div className="space-y-1">
                <Label>Catéter utilizado</Label>
                <Input placeholder="Ex: 12Fr convencional" {...register('cateterUtilizado')} />
              </div>
              <div className="space-y-1">
                <Label>Volume drenado</Label>
                <Input placeholder="Ex: 300-400ml" {...register('volumeDrenadoMl')} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Outras intercorrências / medicamentos</Label>
              <Input placeholder="Ex: Doxazosina 2mg 1x/dia" {...register('outrasIntercorrencias')} />
            </div>

            {/* Produto indicado */}
            <div className="space-y-2">
              <Label>Produto indicado</Label>
              <Select onValueChange={(v) => {
                const p = produtos.find((pr) => pr.codigo === Number(v));
                if (p) setValue('produtoIndicado', { codigo: p.codigo, sexo: p.sexo, french: p.french ?? 0 });
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione o catéter" /></SelectTrigger>
                <SelectContent>
                  {produtos.map((p) => (
                    <SelectItem key={p.codigo} value={String(p.codigo)}>
                      {p.nome} — Cód. {p.codigo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Encaminhamento</Label>
              <Select onValueChange={(v) => setValue('encaminhamento', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.values(EncaminhamentoIU).map((e) => (
                    <SelectItem key={e} value={e}>{ENCAMINHAMENTO_LABEL[e]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>COREN/CRM</Label>
                <Input {...register('coren')} />
              </div>
              <div className="space-y-1">
                <Label>Responsável pelo cateterismo</Label>
                <Input placeholder="Ex: O próprio" {...register('responsavelCateterismo')} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox id="autoriza" onCheckedChange={(c) => setValue('autorizaPesquisa', !!c)} />
                <Label htmlFor="autoriza" className="text-sm cursor-pointer">
                  Paciente autoriza uso de dados para pesquisa
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="aceita" onCheckedChange={(c) => setValue('aceitaInformacoes', !!c)} />
                <Label htmlFor="aceita" className="text-sm cursor-pointer">
                  Aceita receber informações por e-mail/WhatsApp
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={mut.isPending}>
                {mut.isPending ? 'Salvando...' : 'Registrar avaliação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edição de ficha já preenchida (ex.: completar COREN) — form reaproveitado */}
      <NovaAvaliacaoIUDialog
        open={!!editAv}
        onOpenChange={(o) => { if (!o) setEditAv(null); }}
        pacienteId={pacienteId}
        clinicaId={user?.clinicaId}
        produtos={produtos}
        avaliacao={editAv ?? undefined}
        enfermeiroRegistro={user?.registroProfissional}
        onCreated={() => void qc.invalidateQueries({ queryKey: ['avaliacao-iu', pacienteId] })}
      />
      <ConfirmExcluirDialog
        open={!!avParaExcluir}
        titulo="Excluir avaliação de incontinência urinária"
        descricao={<>Tem certeza que deseja excluir a avaliação de <span className="font-medium text-foreground">{formatData(avParaExcluir?.dataAtendimento)}</span>? Esta ação não pode ser desfeita pela tela.</>}
        pending={excluirMut.isPending}
        onCancel={() => setAvParaExcluir(null)}
        onConfirm={() => avParaExcluir && excluirMut.mutate(avParaExcluir.id)}
      />
    </div>
  );
}

// ---- Passo 2: Follow-up ----
function FollowUpStep({ pacienteId, avaliacaoId, followups, user }: {
  pacienteId: string; avaliacaoId?: string; followups: FollowUp[]; user: ReturnType<typeof useAuth>['user'];
}) {
  const [open, setOpen] = useState(false);
  const [fuParaExcluir, setFuParaExcluir] = useState<FollowUp | null>(null);
  const qc = useQueryClient();
  const { register, handleSubmit, setValue, reset } = useForm<Record<string, unknown>>();

  const mut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => followUpApi.create(payload),
    onSuccess: () => {
      toast.success('Follow-up registrado.');
      setOpen(false); reset();
      void qc.invalidateQueries({ queryKey: ['followup', pacienteId] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const excluirMut = useMutation({
    mutationFn: (followupId: string) => followUpApi.excluir(followupId),
    onSuccess: () => {
      toast.success('Follow-up excluído.');
      setFuParaExcluir(null);
      void qc.invalidateQueries({ queryKey: ['followup', pacienteId] });
    },
    onError: (e) => toast.error('Erro ao excluir', apiErrorMessage(e)),
  });

  const podeNovo = user?.papel === Papel.ENFERMEIRO || user?.papel === Papel.ADMIN;

  return (
    <div className="space-y-3">
      {followups.length === 0 && <p className="text-sm text-muted-foreground">Nenhum follow-up registrado.</p>}
      {followups.map((f) => (
        <div key={f.id} className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{formatData(f.dataFollowup)}</span>
            <StatusBadge value={f.statusElegibilidade} labels={STATUS_ELEGIBILIDADE_LABEL} />
            {podeNovo && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive ml-auto" onClick={() => setFuParaExcluir(f)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{f.observacoes}</p>
          {f.proximoFollowup && (
            <p className="text-xs flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" /> Próximo: {formatData(f.proximoFollowup)}
            </p>
          )}
        </div>
      ))}
      {podeNovo && (
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo follow-up
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Registrar Follow-up</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => mut.mutate({ ...v, proximoFollowup: v.proximoFollowup || undefined, pacienteId, avaliacaoIuId: avaliacaoId, clinicaId: user?.clinicaId }))} className="space-y-4">
            <div className="space-y-1">
              <Label>Data do follow-up</Label>
              <Input type="date" {...register('dataFollowup', { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>Status de elegibilidade</Label>
              <Select onValueChange={(v) => setValue('statusElegibilidade', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.values(StatusElegibilidade).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_ELEGIBILIDADE_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Observações clínicas</Label>
              <Textarea rows={3} {...register('observacoes', { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>Próximo follow-up (opcional)</Label>
              <Input type="date" {...register('proximoFollowup')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={mut.isPending}>{mut.isPending ? 'Salvando...' : 'Registrar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmExcluirDialog
        open={!!fuParaExcluir}
        titulo="Excluir follow-up"
        descricao={<>Tem certeza que deseja excluir o follow-up de <span className="font-medium text-foreground">{formatData(fuParaExcluir?.dataFollowup)}</span>? Esta ação não pode ser desfeita pela tela.</>}
        pending={excluirMut.isPending}
        onCancel={() => setFuParaExcluir(null)}
        onConfirm={() => fuParaExcluir && excluirMut.mutate(fuParaExcluir.id)}
      />
    </div>
  );
}

// ---- Passo 3: Laudo Médico ----
function LaudoMedicoStep({ pacienteId, avaliacaoId, produtoIndicado, laudos, produtos, user, clinicaId }: {
  pacienteId: string; avaliacaoId?: string; produtoIndicado?: AvaliacaoIU['produtoIndicado'];
  laudos: LaudoMedico[]; produtos: Produto[]; user: ReturnType<typeof useAuth>['user']; clinicaId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [laudoEmEdicao, setLaudoEmEdicao] = useState<LaudoMedico | null>(null);
  const [laudoParaExcluir, setLaudoParaExcluir] = useState<LaudoMedico | null>(null);
  const qc = useQueryClient();

  const podeCriar = user?.papel === Papel.ENFERMEIRO || user?.papel === Papel.MEDICO || user?.papel === Papel.ADMIN;

  const excluirMut = useMutation({
    mutationFn: (laudoId: string) => laudoMedicoApi.excluir(laudoId),
    onSuccess: () => {
      toast.success('Relatório excluído.');
      setLaudoParaExcluir(null);
      void qc.invalidateQueries({ queryKey: ['laudo-medico', pacienteId] });
    },
    onError: (e) => toast.error('Erro ao excluir', apiErrorMessage(e)),
  });

  return (
    <div className="space-y-3">
      {laudos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum relatório médico judiciário registrado.</p>}
      {laudos.map((l) => (
        <div key={l.id} className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{formatData(l.dataLaudo)}</span>
              <Badge variant={l.status === StatusLaudoMedico.ASSINADO ? 'success' : l.status === StatusLaudoMedico.AGUARDANDO_REVISAO ? 'secondary' : 'warning'}>
                {STATUS_LAUDO_MEDICO_LABEL[l.status]}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {podeCriar && l.status !== StatusLaudoMedico.ASSINADO && (
                <Button size="sm" variant="ghost" onClick={() => { setLaudoEmEdicao(l); setOpen(true); }}>Revisar</Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => window.open(`/fluxo-clinico/${pacienteId}/laudo/${l.id}/imprimir`, '_blank')}>
                <Printer className="h-3 w-3 mr-1" /> Imprimir
              </Button>
              {podeCriar && l.status !== StatusLaudoMedico.ASSINADO && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => setLaudoParaExcluir(l)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{l.diagnosticoFuncional}</p>
          {l.produtosSolicitados.length > 0 && (
            <p className="text-xs text-primary">
              Produtos: {l.produtosSolicitados.map((p) => `${p.descricao} (${p.quantidade}x)`).join(', ')}
            </p>
          )}
        </div>
      ))}
      {podeCriar && (
        <Button size="sm" onClick={() => { setLaudoEmEdicao(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo Relatório Médico Judiciário
        </Button>
      )}
      <NovoLaudoDialog
        open={open}
        onOpenChange={(o) => { setOpen(o); if (!o) setLaudoEmEdicao(null); }}
        pacienteId={pacienteId}
        clinicaId={clinicaId}
        produtos={produtos}
        avaliacaoId={avaliacaoId}
        produtoIndicado={produtoIndicado}
        laudo={laudoEmEdicao ?? undefined}
        onCreated={() => void qc.invalidateQueries({ queryKey: ['laudo-medico', pacienteId] })}
      />
      <ConfirmExcluirDialog
        open={!!laudoParaExcluir}
        titulo="Excluir Relatório Médico Judiciário"
        descricao={<>Tem certeza que deseja excluir o relatório de <span className="font-medium text-foreground">{formatData(laudoParaExcluir?.dataLaudo)}</span>? Esta ação não pode ser desfeita pela tela.</>}
        pending={excluirMut.isPending}
        onCancel={() => setLaudoParaExcluir(null)}
        onConfirm={() => laudoParaExcluir && excluirMut.mutate(laudoParaExcluir.id)}
      />
    </div>
  );
}

// ---- Passo 4: Processo Jurídico ----
function ProcessoJuridicoStep({ pacienteId, avaliacaoId, laudoId, processos, user }: {
  pacienteId: string; avaliacaoId?: string; laudoId?: string;
  processos: ProcessoJuridico[]; user: ReturnType<typeof useAuth>['user'];
}) {
  const [open, setOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [processoSelecionado, setProcessoSelecionado] = useState<string>('');
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm<Record<string, unknown>>();
  const statusForm = useForm<Record<string, unknown>>();
  const docForm = useForm<{ nome: string; url: string; tipo: string }>();

  const addDocMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { nome: string; url: string; tipo: string } }) =>
      processoJuridicoApi.addDocumento(id, payload),
    onSuccess: () => {
      toast.success('Documento adicionado.');
      setDocOpen(false); docForm.reset();
      void qc.invalidateQueries({ queryKey: ['processo-juridico', pacienteId] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const mut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => processoJuridicoApi.create(payload),
    onSuccess: () => {
      toast.success('Processo criado.');
      setOpen(false); reset();
      void qc.invalidateQueries({ queryKey: ['processo-juridico', pacienteId] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      processoJuridicoApi.updateStatus(id, payload),
    onSuccess: () => {
      toast.success('Status atualizado.');
      setStatusOpen(false);
      void qc.invalidateQueries({ queryKey: ['processo-juridico', pacienteId] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const podeCriar = user?.papel === Papel.ADVOGADO || user?.papel === Papel.ADMIN;

  return (
    <div className="space-y-3">
      {processos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum processo registrado.</p>}
      {processos.map((p) => (
        <div key={p.id} className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {p.numeroProcesso && <span className="text-sm font-medium">{p.numeroProcesso}</span>}
              <StatusBadge value={p.status} labels={STATUS_PROCESSO_LABEL} />
            </div>
            {podeCriar && (
              <Button size="sm" variant="outline" onClick={() => { setProcessoSelecionado(p.id); setStatusOpen(true); }}>
                Atualizar status
              </Button>
            )}
          </div>
          {p.tribunal && <p className="text-xs text-muted-foreground">Tribunal: {p.tribunal}</p>}
          {p.dataProtocolo && <p className="text-xs text-muted-foreground">Protocolado: {dayjs(p.dataProtocolo).format('DD/MM/YYYY')}</p>}
          {p.observacoes && <p className="text-xs text-muted-foreground">{p.observacoes}</p>}
          {/* Documentos */}
          {(p.documentos ?? []).length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Documentos:</p>
              {p.documentos.map((d, i) => (
                <a key={i} href={d.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {d.nome} <span className="text-muted-foreground">({d.tipo})</span>
                </a>
              ))}
            </div>
          )}
          {podeCriar && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground mt-1"
              onClick={() => { setProcessoSelecionado(p.id); setDocOpen(true); }}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar documento
            </Button>
          )}
        </div>
      ))}
      {podeCriar && (
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Abrir processo
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Abrir Processo Jurídico</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => mut.mutate({ ...v, pacienteId, avaliacaoIuId: avaliacaoId, laudoMedicoId: laudoId, clinicaId: user?.clinicaId }))} className="space-y-4">
            <div className="space-y-1">
              <Label>Observações iniciais</Label>
              <Textarea rows={3} placeholder="Resumo do caso para abertura do processo..." {...register('observacoes')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={mut.isPending}>{mut.isPending ? 'Criando...' : 'Abrir processo'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={docOpen} onOpenChange={setDocOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Adicionar Documento ao Processo</DialogTitle></DialogHeader>
          <form onSubmit={docForm.handleSubmit((v) => addDocMut.mutate({ id: processoSelecionado, payload: v }))} className="space-y-4">
            <div className="space-y-1">
              <Label>Nome do documento</Label>
              <Input placeholder="Ex: Petição inicial" {...docForm.register('nome', { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>URL (Google Drive, Dropbox, etc.)</Label>
              <Input placeholder="https://..." {...docForm.register('url', { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Input placeholder="Ex: petição, procuração, laudo, RG..." {...docForm.register('tipo', { required: true })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDocOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={addDocMut.isPending}>{addDocMut.isPending ? 'Salvando...' : 'Adicionar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Atualizar Status do Processo</DialogTitle></DialogHeader>
          <form onSubmit={statusForm.handleSubmit((v) => statusMut.mutate({ id: processoSelecionado, payload: v }))} className="space-y-4">
            <div className="space-y-1">
              <Label>Novo status</Label>
              <Select onValueChange={(v) => statusForm.setValue('status', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.values(StatusProcesso).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_PROCESSO_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Número do processo</Label>
              <Input placeholder="0000000-00.0000.0.00.0000" {...statusForm.register('numeroProcesso')} />
            </div>
            <div className="space-y-1">
              <Label>Tribunal / Vara</Label>
              <Input {...statusForm.register('tribunal')} />
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea rows={2} {...statusForm.register('observacoes')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStatusOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={statusMut.isPending}>{statusMut.isPending ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Passo 5: Entregas ----
function EntregasStep({ pacienteId, processoId, avaliacaoId, entregas, produtos, user }: {
  pacienteId: string; processoId?: string; avaliacaoId?: string;
  entregas: Entrega[]; produtos: Produto[]; user: ReturnType<typeof useAuth>['user'];
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { register, handleSubmit, setValue, watch, reset } = useForm<Record<string, unknown>>();

  const mut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => entregasApi.create(payload),
    onSuccess: () => {
      toast.success('Entrega registrada.');
      setOpen(false); reset();
      void qc.invalidateQueries({ queryKey: ['entregas', pacienteId] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const confirmarMut = useMutation({
    mutationFn: (id: string) => entregasApi.confirmar(id),
    onSuccess: () => {
      toast.success('Entrega confirmada.');
      void qc.invalidateQueries({ queryKey: ['entregas', pacienteId] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const STATUS_LABEL: Record<string, string> = { pendente: 'Pendente', enviada: 'Enviada', entregue: 'Entregue', devolvida: 'Devolvida' };

  return (
    <div className="space-y-3">
      {entregas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma entrega registrada.</p>}
      {entregas.map((e) => (
        <div key={e.id} className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{formatData(e.dataEntrega)}</span>
              <Badge variant={e.status === 'entregue' ? 'success' : 'outline'} className="text-xs">
                {STATUS_LABEL[e.status] ?? e.status}
              </Badge>
              <span className="text-xs text-muted-foreground">{ORIGEM_ENTREGA_LABEL[e.origem]}</span>
            </div>
            {e.status !== 'entregue' && (
              <Button size="sm" variant="outline" onClick={() => confirmarMut.mutate(e.id)} disabled={confirmarMut.isPending}>
                Confirmar entrega
              </Button>
            )}
          </div>
          {e.itens.map((item, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              {item.descricao} — {item.quantidade}x — R$ {(item.valorTotalCentavos / 100).toFixed(2)}
            </p>
          ))}
          <p className="text-xs font-medium text-primary">Total: R$ {(e.valorTotalCentavos / 100).toFixed(2)}</p>
        </div>
      ))}
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" /> Registrar entrega
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Registrar Entrega de Produtos</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => {
            const itens = produtos.filter((p) => v[`ent_${p.codigo}`]).map((p) => ({
              codigo: p.codigo, descricao: p.nome,
              quantidade: Number(v[`entqty_${p.codigo}`] ?? 1) || 1,
              valorUnitarioCentavos: 0, valorTotalCentavos: 0,
            }));
            const total = itens.reduce((s, i) => s + i.valorTotalCentavos, 0);
            mut.mutate({
              pacienteId, processoJuridicoId: processoId, avaliacaoIuId: avaliacaoId, clinicaId: user?.clinicaId,
              dataEntrega: v.dataEntrega, origem: v.origem,
              notaFiscal: v.notaFiscal, observacoes: v.observacoes,
              itens, valorTotalCentavos: total,
            });
          })} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Data da entrega</Label>
                <Input type="date" {...register('dataEntrega', { required: true })} />
              </div>
              <div className="space-y-1">
                <Label>Origem</Label>
                <Select onValueChange={(v) => setValue('origem', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {Object.values(OrigemEntrega).map((o) => (
                      <SelectItem key={o} value={o}>{ORIGEM_ENTREGA_LABEL[o]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Produtos entregues</Label>
              {produtos.map((p) => (
                <div key={p.codigo} className="flex items-center gap-3">
                  <Checkbox
                    id={`ent_${p.codigo}`}
                    checked={!!watch(`ent_${p.codigo}`)}
                    onCheckedChange={(c) => setValue(`ent_${p.codigo}`, !!c)}
                  />
                  <Label htmlFor={`ent_${p.codigo}`} className="text-sm flex-1 cursor-pointer">{p.nome}</Label>
                  {!!watch(`ent_${p.codigo}`) && (
                    <Input type="number" min={1} defaultValue={1} className="w-20" {...register(`entqty_${p.codigo}`, { valueAsNumber: true })} />
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Label>Nota fiscal</Label>
              <Input placeholder="NF-e 000000" {...register('notaFiscal')} />
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea rows={2} {...register('observacoes')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={mut.isPending}>{mut.isPending ? 'Salvando...' : 'Registrar entrega'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Cabeçalho com a etapa atual do fluxo, prazo e avanço manual ----
function EtapaFluxoHeader({
  paciente, pacienteId, papel,
}: {
  paciente: { etapaFluxo?: EtapaFluxoClinico; etapaFluxoDesde?: string };
  pacienteId: string;
  papel?: Papel;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const qc = useQueryClient();

  const avancarMut = useMutation({
    mutationFn: () => pacientesApi.avancarEtapaFluxo(pacienteId),
    onSuccess: () => {
      toast.success('Etapa avançada.');
      setConfirmOpen(false);
      void qc.invalidateQueries({ queryKey: ['paciente', pacienteId] });
      void qc.invalidateQueries({ queryKey: ['pacientes-fluxo'] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  if (!paciente.etapaFluxo) return null;
  const info = paciente.etapaFluxoDesde ? calcularPrazoEtapa(paciente.etapaFluxo, paciente.etapaFluxoDesde) : undefined;

  const proximaEtapa = PROXIMA_ETAPA_MANUAL[paciente.etapaFluxo];
  const papeisPermitidos = proximaEtapa ? PAPEIS_AVANCO_MANUAL[paciente.etapaFluxo] ?? [] : [];
  const podeAvancar = !!proximaEtapa && (papel === Papel.ADMIN || (!!papel && papeisPermitidos.includes(papel)));

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
      <span className="text-sm text-muted-foreground">Etapa atual:</span>
      <Badge variant="outline" className="text-sm">{ETAPA_FLUXO_LABEL[paciente.etapaFluxo]}</Badge>
      {info?.diasLimite !== undefined && (
        info.atrasado
          ? <span className="text-red-600 text-sm font-medium">Atrasado {Math.abs(info.diasRestantes!)}d</span>
          : <span className={cn('text-sm font-medium', (info.diasRestantes ?? 99) <= 3 ? 'text-amber-600' : 'text-muted-foreground')}>
              {info.diasRestantes}d restantes
            </span>
      )}
      {podeAvancar && (
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => setConfirmOpen(true)}>
          Avançar etapa
        </Button>
      )}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Confirmar avanço de etapa</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Mover este paciente de <strong>{ETAPA_FLUXO_LABEL[paciente.etapaFluxo]}</strong> para{' '}
            <strong>{proximaEtapa ? ETAPA_FLUXO_LABEL[proximaEtapa] : '—'}</strong>?
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button onClick={() => avancarMut.mutate()} disabled={avancarMut.isPending}>
              {avancarMut.isPending ? 'Avançando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Passo 3: Entrevista ----
function EntrevistaStep({ pacienteId, user }: { pacienteId: string; user: ReturnType<typeof useAuth>['user'] }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { register, handleSubmit, reset } = useForm<Record<string, unknown>>();

  const agendamentosQ = useQuery({
    queryKey: ['agendamentos-paciente', pacienteId],
    queryFn: () => agendaApi.list({ pacienteId }),
  });
  const entrevistas = toItems<Agendamento>(agendamentosQ.data).filter((a) => a.tipo === TipoAgendamento.ENTREVISTA);

  const mut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => agendaApi.create({
      pacienteId,
      medicoId: user?.id ?? '',
      clinicaId: user?.clinicaId ?? '',
      modalidade: ModalidadeAtendimento.ENFERMAGEM,
      tipo: TipoAgendamento.ENTREVISTA,
      dataHoraInicio: payload.dataHoraInicio as string,
      dataHoraFim: payload.dataHoraFim as string,
      observacoes: payload.observacoes as string | undefined,
    }),
    onSuccess: () => {
      toast.success('Entrevista agendada.');
      setOpen(false); reset();
      void qc.invalidateQueries({ queryKey: ['agendamentos-paciente', pacienteId] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const concluirMut = useMutation({
    mutationFn: (id: string) => agendaApi.concluir(id),
    onSuccess: () => {
      toast.success('Entrevista concluída.');
      void qc.invalidateQueries({ queryKey: ['agendamentos-paciente', pacienteId] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  return (
    <div className="space-y-3">
      {entrevistas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma entrevista agendada.</p>}
      {entrevistas.map((a) => (
        <div key={a.id} className="rounded-lg border border-border bg-muted/40 p-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{dayjs(a.dataHoraInicio).format('DD/MM/YYYY HH:mm')}</p>
            <Badge variant="outline" className="text-xs mt-1">{STATUS_AGENDAMENTO_LABEL[a.status]}</Badge>
          </div>
          {a.status !== StatusAgendamento.CONCLUIDO && a.status !== StatusAgendamento.CANCELADO && (
            <Button size="sm" variant="outline" onClick={() => concluirMut.mutate(a.id)} disabled={concluirMut.isPending}>
              Concluir
            </Button>
          )}
        </div>
      ))}
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" /> Agendar entrevista
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Agendar Entrevista</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((v) => mut.mutate(v))} className="space-y-4">
            <div className="space-y-1">
              <Label>Início</Label>
              <Input type="datetime-local" {...register('dataHoraInicio', { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>Fim</Label>
              <Input type="datetime-local" {...register('dataHoraFim', { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea rows={2} {...register('observacoes')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={mut.isPending}>{mut.isPending ? 'Salvando...' : 'Agendar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Passo 4: Documentação (checklist para a judicialização) ----
function DocumentacaoStep({ pacienteId, user }: { pacienteId: string; user: ReturnType<typeof useAuth>['user'] }) {
  const qc = useQueryClient();

  const itensQ = useQuery({
    queryKey: ['checklist-documentos', pacienteId],
    queryFn: () => checklistDocumentosApi.listByPaciente(pacienteId),
  });
  const itens = itensQ.data ?? [];

  const criarPadraoMut = useMutation({
    mutationFn: () => checklistDocumentosApi.criarPadrao(pacienteId),
    onSuccess: () => {
      toast.success('Checklist padrão criado.');
      void qc.invalidateQueries({ queryKey: ['checklist-documentos', pacienteId] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const marcarRecebidoMut = useMutation({
    mutationFn: (id: string) => checklistDocumentosApi.update(id, { status: StatusChecklistDocumento.RECEBIDO }),
    onSuccess: () => {
      toast.success('Documento marcado como recebido.');
      void qc.invalidateQueries({ queryKey: ['checklist-documentos', pacienteId] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  void user;

  return (
    <div className="space-y-3">
      {itens.length === 0 && <p className="text-sm text-muted-foreground">Nenhum documento no checklist ainda.</p>}
      {(itens as ChecklistDocumentoItem[]).map((item) => (
        <div key={item.id} className="rounded-lg border border-border bg-muted/40 p-3 flex items-center justify-between">
          <span className="text-sm">{item.nome}</span>
          <div className="flex items-center gap-2">
            <Badge variant={item.status === StatusChecklistDocumento.RECEBIDO ? 'success' : 'outline'} className="text-xs">
              {STATUS_CHECKLIST_DOCUMENTO_LABEL[item.status]}
            </Badge>
            {item.status !== StatusChecklistDocumento.RECEBIDO && (
              <Button size="sm" variant="outline" onClick={() => marcarRecebidoMut.mutate(item.id)} disabled={marcarRecebidoMut.isPending}>
                Marcar recebido
              </Button>
            )}
          </div>
        </div>
      ))}
      {itens.length === 0 && (
        <Button size="sm" onClick={() => criarPadraoMut.mutate()} disabled={criarPadraoMut.isPending}>
          <Plus className="h-4 w-4 mr-1" /> Criar checklist padrão
        </Button>
      )}
    </div>
  );
}

// ---- Toggle do programa de acompanhamento de incontinência urinária ----
function ProgramaIUToggle({ pacienteId, programaIU }: { pacienteId: string; programaIU: boolean }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (val: boolean) => pacientesApi.update(pacienteId, { programaIU: val }),
    onSuccess: (_, val) => {
      void qc.invalidateQueries({ queryKey: ['paciente', pacienteId] });
      void qc.invalidateQueries({ queryKey: ['pacientes-fluxo'] });
      toast.success(val ? 'Adicionado ao programa de acompanhamento.' : 'Removido do programa de acompanhamento.');
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });
  return (
    <Button
      size="sm"
      variant={programaIU ? 'default' : 'outline'}
      className="ml-auto shrink-0"
      onClick={() => mut.mutate(!programaIU)}
      disabled={mut.isPending}
    >
      {programaIU ? '✓ Em acompanhamento' : '+ Incluir no acompanhamento'}
    </Button>
  );
}

// ---- Helper ----
function StatusBadge({ value, labels }: { value: string; labels: Record<string, string> }) {
  const colorMap: Record<string, string> = {
    em_avaliacao: 'outline',
    elegivel: 'success',
    nao_elegivel: 'destructive',
    em_preparacao: 'outline',
    protocolado: 'outline',
    em_andamento: 'outline',
    ganho: 'success',
    perdido: 'destructive',
    arquivado: 'secondary',
  };
  return (
    <Badge variant={(colorMap[value] as 'outline' | 'success' | 'destructive' | 'secondary') ?? 'outline'} className="text-xs">
      {labels[value] ?? value}
    </Badge>
  );
}
