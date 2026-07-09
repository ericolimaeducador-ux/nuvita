import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import {
  ArrowLeft, User, Download, Plus, FileText, FileSignature, Scale,
  Package, PackageCheck, ClipboardList, CalendarClock, ChevronDown, Stethoscope,
  ListChecks, Trash2, UserCheck, Pencil,
} from 'lucide-react';
import { ProntuarioDetailDialog, NovoAtendimentoDialog } from '@/components/ProntuarioDialogs';
import { NovoDocumentoDialog } from '@/components/NovoDocumentoDialog';
import { NovaAvaliacaoIUDialog, NovoLaudoDialog } from '@/components/FluxoClinicoDialogs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/auth/AuthContext';
import {
  pacientesApi, prontuariosApi, agendaApi, documentosApi,
  laudoMedicoApi, avaliacaoIUApi, entregasApi, processoJuridicoApi,
  anotacaoJuridicaApi, checklistDocumentosApi, followUpApi,
  produtosApi, observacoesPacienteApi,
} from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { formatCpf, formatData, idade, toItems, formatBRL, formatEndereco } from '@/utils';
import {
  Sexo, SEXO_LABEL, ProjetoPaciente, PROJETO_LABEL, STATUS_AGENDAMENTO_LABEL, TIPO_ATENDIMENTO_LABEL,
  STATUS_PROCESSO_LABEL, StatusEntrega, Modulo, Papel,
  StatusChecklistDocumento, STATUS_CHECKLIST_DOCUMENTO_LABEL, TIPO_DOCUMENTO_LABEL,
  StatusElegibilidade, STATUS_ELEGIBILIDADE_LABEL,
  StatusAgendamento, TipoAtendimento, TIPO_ATENDIMENTO_POR_AGENDAMENTO,
  type Agendamento, type Prontuario, type Documento, type Paciente,
  type LaudoMedico, type AvaliacaoIU, type Entrega, type ProcessoJuridico,
} from '@/types';

function DescItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
    </div>
  );
}

/** Seção empilhada recolhível — tudo do paciente vive numa única página. */
function Secao({
  icon, titulo, contagem, acao, defaultOpen = true, children,
}: {
  icon: React.ReactNode; titulo: string; contagem?: number;
  acao?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center gap-3 p-4">
          <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <span className="text-primary">{icon}</span>
            <span className="font-semibold text-foreground">{titulo}</span>
            {contagem !== undefined && <Badge variant="secondary">{contagem}</Badge>}
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {acao}
        </div>
        {open && <div className="px-4 pb-4">{children}</div>}
      </CardContent>
    </Card>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="text-center text-sm text-muted-foreground py-6">{children}</p>;
}

export function PacienteDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const { permissoes, user } = useAuth();
  const [viewProntuarioId, setViewProntuarioId] = useState<string | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);
  const [atendimentoPrefill, setAtendimentoPrefill] = useState<{
    agendamentoId: string; tipo: TipoAtendimento; data: string;
  } | null>(null);

  function iniciarAtendimentoDeAgendamento(a: Agendamento) {
    const tipo = TIPO_ATENDIMENTO_POR_AGENDAMENTO[a.tipo];
    if (!tipo) return;
    setAtendimentoPrefill({
      agendamentoId: a.id,
      tipo,
      data: dayjs(a.dataHoraInicio).format('YYYY-MM-DDTHH:mm'),
    });
    setNovoOpen(true);
  }

  // "Iniciar atendimento" clicado a partir da Agenda: chega aqui via router state.
  // Abre o formulário já preenchido e limpa o state pra não reabrir num refresh/voltar.
  useEffect(() => {
    const vindoDaAgenda = (location.state as { iniciarAgendamento?: { agendamentoId: string; tipo: TipoAtendimento; data: string } } | null)?.iniciarAgendamento;
    if (!vindoDaAgenda) return;
    setAtendimentoPrefill({
      agendamentoId: vindoDaAgenda.agendamentoId,
      tipo: vindoDaAgenda.tipo,
      data: dayjs(vindoDaAgenda.data).format('YYYY-MM-DDTHH:mm'),
    });
    setNovoOpen(true);
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const [novoDocOpen, setNovoDocOpen] = useState(false);
  const [novaAvaliacaoOpen, setNovaAvaliacaoOpen] = useState(false);
  const [avaliacaoEdit, setAvaliacaoEdit] = useState<AvaliacaoIU | null>(null);
  const [novoLaudoOpen, setNovoLaudoOpen] = useState(false);

  const pacQ = useQuery({ queryKey: ['paciente', id], queryFn: () => pacientesApi.get(id), enabled: !!id });
  const prontQ = useQuery({ queryKey: ['prontuarios', 'paciente', id], queryFn: () => prontuariosApi.list({ pacienteId: id }), enabled: !!id });
  const agendaQ = useQuery({ queryKey: ['agenda', 'paciente', id], queryFn: () => agendaApi.list({ pacienteId: id }), enabled: !!id });
  const docsQ = useQuery({ queryKey: ['documentos', 'paciente', id], queryFn: () => documentosApi.list({ pacienteId: id }), enabled: !!id });
  const laudosQ = useQuery({ queryKey: ['laudos', 'paciente', id], queryFn: () => laudoMedicoApi.listByPaciente(id), enabled: !!id });
  const avaliacoesQ = useQuery({ queryKey: ['avaliacoes-iu', 'paciente', id], queryFn: () => avaliacaoIUApi.listByPaciente(id), enabled: !!id });
  const entregasQ = useQuery({ queryKey: ['entregas', 'paciente', id], queryFn: () => entregasApi.listByPaciente(id), enabled: !!id });
  const processosQ = useQuery({ queryKey: ['processos', 'paciente', id], queryFn: () => processoJuridicoApi.listByPaciente(id), enabled: !!id });
  const produtosQ = useQuery({ queryKey: ['produtos'], queryFn: () => produtosApi.list() });

  const produtos = produtosQ.data ?? [];
  const avaliacoes = (avaliacoesQ.data as AvaliacaoIU[]) ?? [];
  // Laudo se apoia na última avaliação (produto indicado + vínculo), como no fluxo clínico.
  const ultimaAvaliacao = avaliacoes[0];

  // Papéis que podem criar cada registro (mesma regra do fluxo clínico, sem depender da etapa).
  const podeNovaAvaliacao = user?.papel === Papel.ENFERMEIRO || user?.papel === Papel.ADMIN;
  const podeNovoLaudo = user?.papel === Papel.MEDICO || user?.papel === Papel.ADMIN;
  // Export LGPD: mesmos papéis autorizados no backend (GET /pacientes/:id/export).
  const podeExportar =
    user?.papel === Papel.SECRETARIA || user?.papel === Papel.MEDICO || user?.papel === Papel.ADMIN;

  // Direito de acesso/portabilidade (LGPD): baixa um JSON com todos os dados do
  // paciente. Antes o botão só disparava o GET e descartava a resposta (nada
  // acontecia na tela); agora gera o download de fato e dá retorno.
  const exportMut = useMutation({
    mutationFn: () => pacientesApi.export(id),
    onSuccess: (dados) => {
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const nome = (pacQ.data?.nome ?? 'paciente').replace(/\s+/g, '_');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nome}-lgpd-${dayjs().format('YYYY-MM-DD')}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Exportação concluída', 'O arquivo com os dados do paciente foi baixado.');
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const prontuarios = useMemo(() => toItems<Prontuario>(prontQ.data as never), [prontQ.data]);
  const entregas = entregasQ.data ?? [];
  const insumosRecebidos = entregas.filter((e) => e.status === StatusEntrega.ENTREGUE);
  const insumosAReceber = entregas.filter((e) => e.status !== StatusEntrega.ENTREGUE);

  if (pacQ.isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  if (pacQ.isError || !pacQ.data) return (
    <div className="p-6 text-center">
      <p className="text-lg font-semibold text-foreground mb-4">Paciente não encontrado</p>
      <Button onClick={() => navigate('/pacientes')}>Voltar para Pacientes</Button>
    </div>
  );

  const p = pacQ.data;

  return (
    <div className="p-6 space-y-4">
      <Button variant="ghost" onClick={() => navigate('/pacientes')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>

      {/* Cabeçalho do paciente */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground">{p.nome}</h2>
              <div className="flex items-center gap-4 mt-1 flex-wrap">
                <span className="text-sm text-muted-foreground">{formatCpf(p.cpf)}</span>
                <span className="text-sm text-muted-foreground">{idade(p.dataNascimento)}</span>
                <Badge variant={p.ativo === false ? 'secondary' : 'success'}>
                  {p.ativo === false ? 'Inativo' : 'Ativo'}
                </Badge>
              </div>
            </div>
            <Button size="sm" onClick={() => setNovoOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo atendimento
            </Button>
            {podeExportar && (
              <Button
                variant="outline"
                size="sm"
                title="Baixa um arquivo com todos os dados do paciente (direito de acesso — LGPD)"
                disabled={exportMut.isPending}
                onClick={() => exportMut.mutate()}
              >
                <Download className="mr-2 h-4 w-4" /> {exportMut.isPending ? 'Exportando…' : 'Exportar (LGPD)'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dados cadastrais */}
      <DadosCadastraisSecao paciente={p} pacienteId={id} />

      {/* Observações gerais — campo livre p/ qualquer profissional de atendimento */}
      <ObservacoesSecao pacienteId={id} observacoesAtuais={p.observacoes} />

      {/* Prontuários / atendimentos */}
      <Secao
        icon={<Stethoscope className="h-4 w-4" />}
        titulo="Prontuários e atendimentos"
        contagem={prontuarios.length}
        acao={
          prontuarios.length > 0 ? (
            <Select onValueChange={(v) => setViewProntuarioId(v)}>
              <SelectTrigger className="w-56 h-9"><SelectValue placeholder="Ir para data…" /></SelectTrigger>
              <SelectContent>
                {prontuarios.map((pr) => (
                  <SelectItem key={pr.id} value={pr.id}>
                    {pr.dataAtendimento ? dayjs(pr.dataAtendimento).format('DD/MM/YYYY HH:mm') : '—'} · {TIPO_ATENDIMENTO_LABEL[pr.tipo] ?? pr.tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
      >
        {prontQ.isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : prontuarios.length === 0 ? (
          <Vazio>Nenhum atendimento registrado. Use “Novo atendimento”.</Vazio>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data do atendimento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Diagnóstico / CID</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {prontuarios.map((pr) => (
                <TableRow key={pr.id} className="cursor-pointer" onClick={() => setViewProntuarioId(pr.id)}>
                  <TableCell>{pr.dataAtendimento ? dayjs(pr.dataAtendimento).format('DD/MM/YYYY HH:mm') : '—'}</TableCell>
                  <TableCell>{TIPO_ATENDIMENTO_LABEL[pr.tipo] ?? pr.tipo}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge variant={pr.assinado ? 'success' : 'warning'}>{pr.assinado ? 'Assinado' : 'Rascunho'}</Badge>
                      {pr.relatorioJudicial && <Badge variant="secondary" className="gap-1"><Scale className="h-3 w-3" />NAT-JUS</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {pr.avaliacao?.diagnosticoDefinitivo || pr.avaliacao?.cid10?.join(', ') || pr.avaliacao?.hipotesesDiagnosticas?.[0] || '—'}
                  </TableCell>
                  <TableCell><FileText className="h-4 w-4 text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Secao>

      {/* Avaliações de incontinência urinária (logo após a consulta de enfermagem, mesma ordem do fluxo clínico) */}
      <Secao
        icon={<ClipboardList className="h-4 w-4" />}
        titulo="Avaliações de incontinência urinária"
        contagem={avaliacoesQ.data?.length}
        defaultOpen={false}
        acao={
          podeNovaAvaliacao ? (
            <Button size="sm" variant="outline" onClick={() => { setAvaliacaoEdit(null); setNovaAvaliacaoOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Nova avaliação
            </Button>
          ) : undefined
        }
      >
        {avaliacoesQ.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (avaliacoesQ.data ?? []).length === 0 ? (
          <Vazio>Nenhuma avaliação de IU registrada.</Vazio>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Motivo</TableHead><TableHead>Cateter indicado</TableHead><TableHead className="w-40" /></TableRow></TableHeader>
            <TableBody>
              {(avaliacoesQ.data as AvaliacaoIU[]).map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{formatData(a.dataAtendimento)}</TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-xs">{a.motivoIU || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{a.produtoIndicado ? `${a.produtoIndicado.sexo} ${a.produtoIndicado.french}Fr` : '—'}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {podeNovaAvaliacao && (
                      <Button variant="ghost" size="sm" onClick={() => { setAvaliacaoEdit(a); setNovaAvaliacaoOpen(true); }}>Editar</Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/fluxo-clinico/${id}/avaliacao/${a.id}/imprimir`)}>Imprimir</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Secao>

      {/* Documentos */}
      <Secao
        icon={<FileText className="h-4 w-4" />}
        titulo="Documentos"
        contagem={toItems<Documento>(docsQ.data as never).length}
        defaultOpen={false}
        acao={
          <Button size="sm" variant="outline" onClick={() => setNovoDocOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo documento
          </Button>
        }
      >
        {docsQ.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : toItems<Documento>(docsQ.data as never).length === 0 ? (
          <Vazio>Nenhum documento anexado.</Vazio>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead>Data</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
            <TableBody>
              {toItems<Documento>(docsQ.data as never).map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{d.tipo ? TIPO_DOCUMENTO_LABEL[d.tipo] : '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{d.criadoEm ? dayjs(d.criadoEm).format('DD/MM/YYYY') : '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      const r = await documentosApi.accessUrl(d.id);
                      if (r?.accessUrl) window.open(r.accessUrl, '_blank');
                    }}>Abrir</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Secao>

      {/* Checklist de documentos (secretaria/admin) */}
      {permissoes.includes(Modulo.DOCUMENTOS) && <ChecklistDocumentosSecao pacienteId={id} />}

      {/* Laudos / relatórios médicos */}
      <Secao
        icon={<FileSignature className="h-4 w-4" />}
        titulo="Laudos e relatórios médicos"
        contagem={laudosQ.data?.length}
        defaultOpen={false}
        acao={
          podeNovoLaudo ? (
            <Button size="sm" variant="outline" onClick={() => setNovoLaudoOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo laudo
            </Button>
          ) : undefined
        }
      >
        {laudosQ.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (laudosQ.data ?? []).length === 0 ? (
          <Vazio>Nenhum laudo emitido.</Vazio>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>CID-10</TableHead><TableHead>Situação</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
            <TableBody>
              {(laudosQ.data as LaudoMedico[]).map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{formatData(l.dataLaudo)}</TableCell>
                  <TableCell className="text-muted-foreground">{l.cid10?.join(', ') || '—'}</TableCell>
                  <TableCell><Badge variant={l.assinado ? 'success' : 'warning'}>{l.assinado ? 'Assinado' : 'Rascunho'}</Badge></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/fluxo-clinico/${id}/laudo/${l.id}/imprimir`)}>Imprimir</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Secao>

      {/* Follow-up de elegibilidade (ligações do enfermeiro) */}
      {permissoes.includes(Modulo.FLUXO_CLINICO) && <FollowUpSecao pacienteId={id} />}

      {/* Insumos a receber */}
      <Secao icon={<Package className="h-4 w-4" />} titulo="Insumos a receber" contagem={insumosAReceber.length} defaultOpen={false}>
        {entregasQ.isLoading ? <Skeleton className="h-20 w-full" /> : insumosAReceber.length === 0 ? (
          <Vazio>Nenhum insumo pendente.</Vazio>
        ) : <TabelaEntregas entregas={insumosAReceber} />}
      </Secao>

      {/* Processos jurídicos */}
      <Secao icon={<Scale className="h-4 w-4" />} titulo="Processos jurídicos" contagem={processosQ.data?.length} defaultOpen={false}>
        {processosQ.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (processosQ.data ?? []).length === 0 ? (
          <Vazio>Nenhum processo jurídico.</Vazio>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Nº do processo</TableHead><TableHead>Tribunal</TableHead><TableHead>Status</TableHead><TableHead>Protocolo</TableHead></TableRow></TableHeader>
            <TableBody>
              {(processosQ.data as ProcessoJuridico[]).map((pr) => (
                <TableRow key={pr.id}>
                  <TableCell className="font-medium">{pr.numeroProcesso || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{pr.tribunal || '—'}</TableCell>
                  <TableCell><Badge>{STATUS_PROCESSO_LABEL[pr.status] ?? pr.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{pr.dataProtocolo ? dayjs(pr.dataProtocolo).format('DD/MM/YYYY') : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Secao>

      {/* Anotações jurídicas (campo livre do advogado, fora do prontuário clínico) */}
      {permissoes.includes(Modulo.PROCESSOS) && <AnotacoesJuridicasSecao pacienteId={id} />}

      {/* Histórico de agenda */}
      <Secao icon={<CalendarClock className="h-4 w-4" />} titulo="Histórico de agenda" contagem={toItems<Agendamento>(agendaQ.data as never).length} defaultOpen={false}>
        {agendaQ.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : toItems<Agendamento>(agendaQ.data as never).length === 0 ? (
          <Vazio>Nenhum agendamento.</Vazio>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Início</TableHead><TableHead>Status</TableHead><TableHead className="w-40" /></TableRow></TableHeader>
            <TableBody>
              {toItems<Agendamento>(agendaQ.data as never).map((a) => {
                const podeIniciar =
                  (a.status === StatusAgendamento.AGENDADO || a.status === StatusAgendamento.CONFIRMADO) &&
                  !!TIPO_ATENDIMENTO_POR_AGENDAMENTO[a.tipo];
                return (
                  <TableRow key={a.id}>
                    <TableCell>{dayjs(a.dataHoraInicio).format('DD/MM/YYYY HH:mm')}</TableCell>
                    <TableCell><Badge>{STATUS_AGENDAMENTO_LABEL[a.status] ?? a.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {podeIniciar && (
                        <Button variant="ghost" size="sm" onClick={() => iniciarAtendimentoDeAgendamento(a)}>
                          Iniciar atendimento
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Secao>

      {/* Insumos recebidos — a pedido do usuário, fica por último: são o que resta após ganhar o processo jurídico */}
      <Secao icon={<PackageCheck className="h-4 w-4" />} titulo="Insumos recebidos" contagem={insumosRecebidos.length} defaultOpen={false}>
        {entregasQ.isLoading ? <Skeleton className="h-20 w-full" /> : insumosRecebidos.length === 0 ? (
          <Vazio>Nenhum insumo entregue ainda.</Vazio>
        ) : <TabelaEntregas entregas={insumosRecebidos} />}
      </Secao>

      <ProntuarioDetailDialog
        prontuarioId={viewProntuarioId}
        pacienteId={id}
        open={!!viewProntuarioId}
        onOpenChange={(o) => { if (!o) setViewProntuarioId(null); }}
      />
      <NovoAtendimentoDialog
        pacienteId={id}
        pacienteNome={p.nome}
        open={novoOpen}
        onOpenChange={(o) => { setNovoOpen(o); if (!o) setAtendimentoPrefill(null); }}
        agendamentoId={atendimentoPrefill?.agendamentoId}
        initialTipo={atendimentoPrefill?.tipo}
        initialData={atendimentoPrefill?.data}
      />
      <NovoDocumentoDialog
        pacienteId={id}
        open={novoDocOpen}
        onOpenChange={setNovoDocOpen}
      />
      <NovaAvaliacaoIUDialog
        open={novaAvaliacaoOpen}
        onOpenChange={(o) => { setNovaAvaliacaoOpen(o); if (!o) setAvaliacaoEdit(null); }}
        pacienteId={id}
        clinicaId={user?.clinicaId}
        produtos={produtos}
        avaliacao={avaliacaoEdit ?? undefined}
        enfermeiroRegistro={user?.registroProfissional}
        onCreated={() => void qc.invalidateQueries({ queryKey: ['avaliacoes-iu', 'paciente', id] })}
      />
      <NovoLaudoDialog
        open={novoLaudoOpen}
        onOpenChange={setNovoLaudoOpen}
        pacienteId={id}
        clinicaId={user?.clinicaId}
        produtos={produtos}
        avaliacaoId={ultimaAvaliacao?.id}
        produtoIndicado={ultimaAvaliacao?.produtoIndicado}
        onCreated={() => void qc.invalidateQueries({ queryKey: ['laudos', 'paciente', id] })}
      />
    </div>
  );
}

function TabelaEntregas({ entregas }: { entregas: Entrega[] }) {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Itens</TableHead><TableHead>Valor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
      <TableBody>
        {entregas.map((e) => (
          <TableRow key={e.id}>
            <TableCell>{formatData(e.dataEntrega)}</TableCell>
            <TableCell className="text-muted-foreground">
              {(e.itens ?? []).map((i) => `${i.quantidade}× ${i.descricao}`).join(', ') || '—'}
            </TableCell>
            <TableCell>{formatBRL((e.valorTotalCentavos ?? 0) / 100)}</TableCell>
            <TableCell><Badge variant={e.status === StatusEntrega.ENTREGUE ? 'success' : 'warning'}>{e.status}</Badge></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** Timeline de texto livre do jurídico sobre o paciente — separada do prontuário
 * clínico (assinado/imutável), para não misturar anotação jurídica com SOAP. */
function AnotacoesJuridicasSecao({ pacienteId }: { pacienteId: string }) {
  const qc = useQueryClient();
  const [texto, setTexto] = useState('');

  const listQ = useQuery({
    queryKey: ['anotacoes-juridicas', pacienteId],
    queryFn: () => anotacaoJuridicaApi.listByPaciente(pacienteId),
  });

  const createMut = useMutation({
    mutationFn: () => anotacaoJuridicaApi.create({ pacienteId, texto: texto.trim() }),
    onSuccess: () => {
      setTexto('');
      void qc.invalidateQueries({ queryKey: ['anotacoes-juridicas', pacienteId] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  return (
    <Secao icon={<Scale className="h-4 w-4" />} titulo="Anotações jurídicas" contagem={listQ.data?.length} defaultOpen={false}>
      <div className="space-y-3">
        <div className="space-y-2">
          <Textarea
            rows={3}
            placeholder="Registre aqui observações jurídicas sobre o caso do paciente…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={texto.trim().length < 3 || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? 'Salvando…' : 'Adicionar anotação'}
            </Button>
          </div>
        </div>

        {listQ.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (listQ.data ?? []).length === 0 ? (
          <Vazio>Nenhuma anotação jurídica registrada.</Vazio>
        ) : (
          <div className="space-y-2">
            {(listQ.data ?? []).map((a) => (
              <div key={a.id} className="glass rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  {dayjs(a.criadoEm).format('DD/MM/YYYY HH:mm')}
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{a.texto}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Secao>
  );
}

/** Checklist administrativo de documentos pendentes/recebidos (secretaria/admin),
 * independente dos arquivos em si (seção Documentos, que é upload de fato). */
function ChecklistDocumentosSecao({ pacienteId }: { pacienteId: string }) {
  const qc = useQueryClient();
  const [novoNome, setNovoNome] = useState('');

  const listQ = useQuery({
    queryKey: ['checklist-documentos', pacienteId],
    queryFn: () => checklistDocumentosApi.listByPaciente(pacienteId),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['checklist-documentos', pacienteId] });

  const createMut = useMutation({
    mutationFn: () => checklistDocumentosApi.create({ pacienteId, nome: novoNome.trim() }),
    onSuccess: () => { setNovoNome(''); void invalidate(); },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const criarPadraoMut = useMutation({
    mutationFn: () => checklistDocumentosApi.criarPadrao(pacienteId),
    onSuccess: () => void invalidate(),
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusChecklistDocumento }) =>
      checklistDocumentosApi.update(id, { status }),
    onSuccess: () => void invalidate(),
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => checklistDocumentosApi.remove(id),
    onSuccess: () => void invalidate(),
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const itens = listQ.data ?? [];
  const pendentes = itens.filter((i) => i.status === StatusChecklistDocumento.PENDENTE).length;

  return (
    <Secao icon={<ListChecks className="h-4 w-4" />} titulo="Checklist de documentos" contagem={itens.length} defaultOpen={false}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Nome do documento (ex.: RG, comprovante de residência…)"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && novoNome.trim().length >= 2) createMut.mutate(); }}
          />
          <Button
            size="sm"
            disabled={novoNome.trim().length < 2 || createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            disabled={criarPadraoMut.isPending}
            onClick={() => criarPadraoMut.mutate()}
          >
            {criarPadraoMut.isPending ? 'Criando…' : 'Usar lista padrão'}
          </Button>
        </div>

        {listQ.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : itens.length === 0 ? (
          <Vazio>Nenhum documento no checklist. Use "Usar lista padrão" ou adicione manualmente.</Vazio>
        ) : (
          <div className="space-y-1.5">
            {pendentes > 0 && (
              <p className="text-xs font-medium text-amber-500">⚠ {pendentes} documento{pendentes !== 1 ? 's' : ''} pendente{pendentes !== 1 ? 's' : ''}</p>
            )}
            {itens.map((item) => (
              <div key={item.id} className="flex items-center gap-3 glass rounded-lg p-2.5">
                <button
                  type="button"
                  onClick={() => toggleMut.mutate({
                    id: item.id,
                    status: item.status === StatusChecklistDocumento.PENDENTE
                      ? StatusChecklistDocumento.RECEBIDO
                      : StatusChecklistDocumento.PENDENTE,
                  })}
                >
                  <Badge
                    variant={item.status === StatusChecklistDocumento.RECEBIDO ? 'success' : 'warning'}
                    className="cursor-pointer"
                  >
                    {STATUS_CHECKLIST_DOCUMENTO_LABEL[item.status]}
                  </Badge>
                </button>
                <span className="text-sm text-foreground flex-1 min-w-0 truncate">{item.nome}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeMut.mutate(item.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Secao>
  );
}

const editPacienteSchema = z.object({
  cpf: z.string().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF inválido.').optional().or(z.literal('')),
  dataNascimento: z.string().optional(),
  sexo: z.nativeEnum(Sexo).optional().or(z.literal('')),
  projeto: z.nativeEnum(ProjetoPaciente).optional().or(z.literal('')),
  telefone: z.string().optional(),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
  consentimento: z.boolean().optional(),
  logradouro: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
});
type EditPacienteForm = z.infer<typeof editPacienteSchema>;

/** Dados cadastrais do paciente — muitos só ficam completos após a 1ª consulta
 * (CPF, nascimento, consentimento LGPD), por isso o cadastro inicial não trava
 * nesses campos e esta seção permite completá-los/corrigi-los a qualquer momento. */
function DadosCadastraisSecao({ paciente: p, pacienteId }: { paciente: Paciente; pacienteId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<EditPacienteForm>({
    resolver: zodResolver(editPacienteSchema),
  });

  function abrir() {
    reset({
      cpf: p.cpf ?? '',
      dataNascimento: p.dataNascimento ? p.dataNascimento.slice(0, 10) : '',
      sexo: p.sexo ?? '',
      projeto: p.projeto ?? '',
      telefone: p.telefone ?? '',
      email: p.email ?? '',
      consentimento: !!p.consentimentoLGPD?.aceito,
      logradouro: p.endereco?.logradouro ?? '',
      numero: p.endereco?.numero ?? '',
      complemento: p.endereco?.complemento ?? '',
      bairro: p.endereco?.bairro ?? '',
      cidade: p.endereco?.cidade ?? '',
      estado: p.endereco?.estado ?? '',
      cep: p.endereco?.cep ?? '',
    });
    setOpen(true);
  }

  const updateMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => pacientesApi.update(pacienteId, payload),
    onSuccess: () => {
      toast.success('Cadastro atualizado.');
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ['paciente', pacienteId] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  function onSubmit(v: EditPacienteForm) {
    // Endereço só é enviado se ao menos um campo foi preenchido; senão vai undefined
    // (o backend interpreta ausência como "não alterar" no PATCH).
    const enderecoCampos = {
      logradouro: v.logradouro?.trim() || undefined,
      numero: v.numero?.trim() || undefined,
      complemento: v.complemento?.trim() || undefined,
      bairro: v.bairro?.trim() || undefined,
      cidade: v.cidade?.trim() || undefined,
      estado: v.estado?.trim() || undefined,
      cep: v.cep?.trim() || undefined,
    };
    const temEndereco = Object.values(enderecoCampos).some(Boolean);

    updateMut.mutate({
      cpf: v.cpf || undefined,
      dataNascimento: v.dataNascimento ? dayjs(v.dataNascimento).format('YYYY-MM-DD') : undefined,
      sexo: v.sexo || undefined,
      projeto: v.projeto || undefined,
      telefone: v.telefone || undefined,
      email: v.email || undefined,
      endereco: temEndereco ? enderecoCampos : undefined,
      consentimentoLGPD: v.consentimento
        ? { aceito: true, dataAceite: p.consentimentoLGPD?.aceito ? p.consentimentoLGPD.dataAceite : new Date().toISOString(), versao: '1.0' }
        : undefined,
    });
  }

  return (
    <Secao
      icon={<User className="h-4 w-4" />}
      titulo="Dados cadastrais"
      defaultOpen={false}
      acao={
        <Button variant="ghost" size="icon" title="Editar cadastro" onClick={abrir}>
          <Pencil className="h-4 w-4" />
        </Button>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 glass rounded-xl p-4">
        <DescItem label="Nome" value={p.nome} />
        <DescItem label="CPF" value={formatCpf(p.cpf)} />
        <DescItem label="Nascimento" value={formatData(p.dataNascimento)} />
        <DescItem label="Sexo" value={p.sexo ? SEXO_LABEL[p.sexo] : '—'} />
        <DescItem label="Projeto" value={p.projeto ? PROJETO_LABEL[p.projeto] : '—'} />
        <DescItem label="Telefone" value={p.telefone || '—'} />
        <DescItem label="E-mail" value={p.email || '—'} />
        <DescItem label="Consentimento LGPD" value={p.consentimentoLGPD?.aceito ? 'Aceito' : 'Pendente'} />
        <div className="col-span-2 sm:col-span-3">
          <DescItem label="Endereço" value={formatEndereco(p.endereco)} />
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar cadastro</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="editCpf">CPF</Label>
                <Input id="editCpf" placeholder="000.000.000-00" {...register('cpf')} />
                {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDataNascimento">Nascimento</Label>
                <Input id="editDataNascimento" type="date" {...register('dataNascimento')} />
              </div>
              <div className="space-y-2">
                <Label>Sexo</Label>
                <Select value={watch('sexo') || undefined} onValueChange={(v) => setValue('sexo', v as Sexo)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {Object.values(Sexo).map((s) => <SelectItem key={s} value={s}>{SEXO_LABEL[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select value={watch('projeto') || undefined} onValueChange={(v) => setValue('projeto', v as ProjetoPaciente)}>
                <SelectTrigger><SelectValue placeholder="Sem projeto" /></SelectTrigger>
                <SelectContent>
                  {Object.values(ProjetoPaciente).map((pj) => <SelectItem key={pj} value={pj}>{PROJETO_LABEL[pj]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="editTelefone">Telefone</Label>
                <Input id="editTelefone" placeholder="(00) 00000-0000" {...register('telefone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEmail">E-mail</Label>
                <Input id="editEmail" type="email" placeholder="paciente@email.com" {...register('email')} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-3 rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">Endereço</p>
              <div className="grid grid-cols-6 gap-3">
                <div className="space-y-2 col-span-4">
                  <Label htmlFor="editLogradouro">Logradouro</Label>
                  <Input id="editLogradouro" placeholder="Rua / Avenida" {...register('logradouro')} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="editNumero">Número</Label>
                  <Input id="editNumero" placeholder="123" {...register('numero')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="editComplemento">Complemento</Label>
                  <Input id="editComplemento" placeholder="Apto, bloco…" {...register('complemento')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editBairro">Bairro</Label>
                  <Input id="editBairro" {...register('bairro')} />
                </div>
              </div>
              <div className="grid grid-cols-6 gap-3">
                <div className="space-y-2 col-span-3">
                  <Label htmlFor="editCidade">Cidade</Label>
                  <Input id="editCidade" {...register('cidade')} />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="editEstado">UF</Label>
                  <Input id="editEstado" placeholder="SP" maxLength={2} {...register('estado')} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="editCep">CEP</Label>
                  <Input id="editCep" placeholder="00000-000" {...register('cep')} />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="editConsentimento" checked={watch('consentimento')} onCheckedChange={(c) => setValue('consentimento', !!c)} />
              <Label htmlFor="editConsentimento" className="text-sm leading-tight cursor-pointer">
                O paciente consente com o tratamento de seus dados (LGPD).
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={updateMut.isPending}>{updateMut.isPending ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Secao>
  );
}

/** Timeline de observações sobre o paciente: cada registro é isolado e guarda
 * quem escreveu e quando (append-only, nada é sobrescrito). Aberta a qualquer
 * profissional de atendimento. A observação legada (campo único antigo) é
 * mostrada como registro histórico para não se perder. */
function ObservacoesSecao({ pacienteId, observacoesAtuais }: { pacienteId: string; observacoesAtuais?: string }) {
  const qc = useQueryClient();
  const [texto, setTexto] = useState('');

  const listQ = useQuery({
    queryKey: ['observacoes-paciente', pacienteId],
    queryFn: () => observacoesPacienteApi.listByPaciente(pacienteId),
  });

  const createMut = useMutation({
    mutationFn: () => observacoesPacienteApi.create({ pacienteId, texto: texto.trim() }),
    onSuccess: () => {
      setTexto('');
      toast.success('Observação adicionada.');
      void qc.invalidateQueries({ queryKey: ['observacoes-paciente', pacienteId] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const observacoes = listQ.data ?? [];
  const legado = observacoesAtuais?.trim();

  return (
    <Secao
      icon={<FileText className="h-4 w-4" />}
      titulo="Observações"
      contagem={observacoes.length + (legado ? 1 : 0)}
      defaultOpen={false}
    >
      <div className="space-y-3">
        <div className="space-y-2">
          <Textarea
            rows={3}
            placeholder="Registre uma observação sobre o paciente. Fica com seu nome e a data/hora, visível para toda a equipe…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={texto.trim().length < 1 || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              {createMut.isPending ? 'Salvando…' : 'Adicionar observação'}
            </Button>
          </div>
        </div>

        {listQ.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : observacoes.length === 0 && !legado ? (
          <Vazio>Nenhuma observação registrada.</Vazio>
        ) : (
          <div className="space-y-2">
            {observacoes.map((o) => (
              <div key={o.id} className="glass rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  {dayjs(o.criadoEm).format('DD/MM/YYYY HH:mm')} · {o.autorEmail}
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{o.texto}</p>
              </div>
            ))}
            {legado && (
              <div className="glass rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Observação anterior (registro histórico)</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{legado}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Secao>
  );
}

/** Somente leitura — o registro em si é feito em /fluxo-clinico/:id (Passo 2),
 * onde o enfermeiro já tem o fluxo completo de elegibilidade. */
function FollowUpSecao({ pacienteId }: { pacienteId: string }) {
  const navigate = useNavigate();
  const listQ = useQuery({
    queryKey: ['followup', 'paciente', pacienteId],
    queryFn: () => followUpApi.listByPaciente(pacienteId),
  });
  const followups = listQ.data ?? [];

  return (
    <Secao
      icon={<UserCheck className="h-4 w-4" />}
      titulo="Follow-up"
      contagem={followups.length}
      defaultOpen={false}
      acao={
        <Button size="sm" variant="outline" onClick={() => navigate(`/fluxo-clinico/${pacienteId}`)}>
          Ver no fluxo clínico
        </Button>
      }
    >
      {listQ.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : followups.length === 0 ? (
        <Vazio>Nenhum follow-up registrado ainda.</Vazio>
      ) : (
        <Table>
          <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Elegibilidade</TableHead><TableHead>Observações</TableHead></TableRow></TableHeader>
          <TableBody>
            {followups.map((f) => (
              <TableRow key={f.id}>
                <TableCell>{formatData(f.dataFollowup)}</TableCell>
                <TableCell>
                  <Badge variant={f.statusElegibilidade === StatusElegibilidade.ELEGIVEL ? 'success' : f.statusElegibilidade === StatusElegibilidade.NAO_ELEGIVEL ? 'destructive' : 'warning'}>
                    {STATUS_ELEGIBILIDADE_LABEL[f.statusElegibilidade]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground truncate max-w-xs">{f.observacoes || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Secao>
  );
}
