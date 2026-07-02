import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  ArrowLeft, User, Download, Plus, FileText, FileSignature, Scale,
  Package, PackageCheck, ClipboardList, CalendarClock, ChevronDown, Stethoscope,
} from 'lucide-react';
import { ProntuarioDetailDialog, NovoAtendimentoDialog } from '@/components/ProntuarioDialogs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  pacientesApi, prontuariosApi, agendaApi, documentosApi,
  laudoMedicoApi, avaliacaoIUApi, entregasApi, processoJuridicoApi,
} from '@/api/resources';
import { formatCpf, idade, toItems, formatBRL } from '@/utils';
import {
  SEXO_LABEL, STATUS_AGENDAMENTO_LABEL, TIPO_ATENDIMENTO_LABEL,
  STATUS_PROCESSO_LABEL, StatusEntrega,
  type Agendamento, type Prontuario, type Sexo, type Documento,
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
  const [viewProntuarioId, setViewProntuarioId] = useState<string | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);

  const pacQ = useQuery({ queryKey: ['paciente', id], queryFn: () => pacientesApi.get(id), enabled: !!id });
  const prontQ = useQuery({ queryKey: ['prontuarios', 'paciente', id], queryFn: () => prontuariosApi.list({ pacienteId: id }), enabled: !!id });
  const agendaQ = useQuery({ queryKey: ['agenda', 'paciente', id], queryFn: () => agendaApi.list({ pacienteId: id }), enabled: !!id });
  const docsQ = useQuery({ queryKey: ['documentos', 'paciente', id], queryFn: () => documentosApi.list({ pacienteId: id }), enabled: !!id });
  const laudosQ = useQuery({ queryKey: ['laudos', 'paciente', id], queryFn: () => laudoMedicoApi.listByPaciente(id), enabled: !!id });
  const avaliacoesQ = useQuery({ queryKey: ['avaliacoes-iu', 'paciente', id], queryFn: () => avaliacaoIUApi.listByPaciente(id), enabled: !!id });
  const entregasQ = useQuery({ queryKey: ['entregas', 'paciente', id], queryFn: () => entregasApi.listByPaciente(id), enabled: !!id });
  const processosQ = useQuery({ queryKey: ['processos', 'paciente', id], queryFn: () => processoJuridicoApi.listByPaciente(id), enabled: !!id });

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
            <Button variant="outline" size="sm" onClick={() => pacientesApi.export(p.id)}>
              <Download className="mr-2 h-4 w-4" /> Exportar (LGPD)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dados cadastrais */}
      <Secao icon={<User className="h-4 w-4" />} titulo="Dados cadastrais" defaultOpen={false}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 glass rounded-xl p-4">
          <DescItem label="Nome" value={p.nome} />
          <DescItem label="CPF" value={formatCpf(p.cpf)} />
          <DescItem label="Nascimento" value={p.dataNascimento ? dayjs(p.dataNascimento).format('DD/MM/YYYY') : '—'} />
          <DescItem label="Sexo" value={p.sexo ? SEXO_LABEL[p.sexo as Sexo] : '—'} />
          <DescItem label="Telefone" value={p.telefone || '—'} />
          <DescItem label="E-mail" value={p.email || '—'} />
        </div>
      </Secao>

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

      {/* Documentos */}
      <Secao icon={<FileText className="h-4 w-4" />} titulo="Documentos" contagem={toItems<Documento>(docsQ.data as never).length} defaultOpen={false}>
        {docsQ.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : toItems<Documento>(docsQ.data as never).length === 0 ? (
          <Vazio>Nenhum documento anexado.</Vazio>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Data</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
            <TableBody>
              {toItems<Documento>(docsQ.data as never).map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.nome || d.titulo || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{d.tipo || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{d.criadoEm ? dayjs(d.criadoEm).format('DD/MM/YYYY') : '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={async () => {
                      const r = await documentosApi.accessUrl(d.id);
                      if (r?.url) window.open(r.url, '_blank');
                    }}>Abrir</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Secao>

      {/* Laudos / relatórios médicos */}
      <Secao icon={<FileSignature className="h-4 w-4" />} titulo="Laudos e relatórios médicos" contagem={laudosQ.data?.length} defaultOpen={false}>
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
                  <TableCell>{l.dataLaudo ? dayjs(l.dataLaudo).format('DD/MM/YYYY') : '—'}</TableCell>
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

      {/* Avaliações de IU (VaPro) */}
      <Secao icon={<ClipboardList className="h-4 w-4" />} titulo="Avaliações de incontinência (VaPro)" contagem={avaliacoesQ.data?.length} defaultOpen={false}>
        {avaliacoesQ.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (avaliacoesQ.data ?? []).length === 0 ? (
          <Vazio>Nenhuma avaliação de IU registrada.</Vazio>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Motivo</TableHead><TableHead>Cateter indicado</TableHead><TableHead className="w-24" /></TableRow></TableHeader>
            <TableBody>
              {(avaliacoesQ.data as AvaliacaoIU[]).map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.dataAtendimento ? dayjs(a.dataAtendimento).format('DD/MM/YYYY') : '—'}</TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-xs">{a.motivoIU || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{a.produtoIndicado ? `${a.produtoIndicado.sexo} ${a.produtoIndicado.french}Fr` : '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/fluxo-clinico/${id}/avaliacao/${a.id}/imprimir`)}>Imprimir</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Secao>

      {/* Insumos a receber */}
      <Secao icon={<Package className="h-4 w-4" />} titulo="Insumos a receber" contagem={insumosAReceber.length} defaultOpen={false}>
        {entregasQ.isLoading ? <Skeleton className="h-20 w-full" /> : insumosAReceber.length === 0 ? (
          <Vazio>Nenhum insumo pendente.</Vazio>
        ) : <TabelaEntregas entregas={insumosAReceber} />}
      </Secao>

      {/* Insumos recebidos */}
      <Secao icon={<PackageCheck className="h-4 w-4" />} titulo="Insumos recebidos" contagem={insumosRecebidos.length} defaultOpen={false}>
        {entregasQ.isLoading ? <Skeleton className="h-20 w-full" /> : insumosRecebidos.length === 0 ? (
          <Vazio>Nenhum insumo entregue ainda.</Vazio>
        ) : <TabelaEntregas entregas={insumosRecebidos} />}
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

      {/* Histórico de agenda */}
      <Secao icon={<CalendarClock className="h-4 w-4" />} titulo="Histórico de agenda" contagem={toItems<Agendamento>(agendaQ.data as never).length} defaultOpen={false}>
        {agendaQ.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : toItems<Agendamento>(agendaQ.data as never).length === 0 ? (
          <Vazio>Nenhum agendamento.</Vazio>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Início</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {toItems<Agendamento>(agendaQ.data as never).map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{dayjs(a.dataHoraInicio).format('DD/MM/YYYY HH:mm')}</TableCell>
                  <TableCell><Badge>{STATUS_AGENDAMENTO_LABEL[a.status] ?? a.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
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
        onOpenChange={setNovoOpen}
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
            <TableCell>{e.dataEntrega ? dayjs(e.dataEntrega).format('DD/MM/YYYY') : '—'}</TableCell>
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
