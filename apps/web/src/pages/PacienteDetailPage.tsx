import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { ArrowLeft, User, Download, Plus, FileText } from 'lucide-react';
import { ProntuarioDetailDialog, NovoAtendimentoDialog } from '@/components/ProntuarioDialogs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { pacientesApi, prontuariosApi, agendaApi } from '@/api/resources';
import { formatCpf, idade, toItems } from '@/utils';
import {
  SEXO_LABEL,
  STATUS_AGENDAMENTO_LABEL,
  TIPO_ATENDIMENTO_LABEL,
  type Agendamento,
  type Prontuario,
  type Sexo,
} from '@/types';

function DescItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
    </div>
  );
}

export function PacienteDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [viewProntuarioId, setViewProntuarioId] = useState<string | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);

  const pacQ = useQuery({ queryKey: ['paciente', id], queryFn: () => pacientesApi.get(id), enabled: !!id });
  const prontQ = useQuery({ queryKey: ['prontuarios', 'paciente', id], queryFn: () => prontuariosApi.list({ pacienteId: id }), enabled: !!id });
  const agendaQ = useQuery({ queryKey: ['agenda', 'paciente', id], queryFn: () => agendaApi.list({ pacienteId: id }), enabled: !!id });

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
    <div className="p-6">
      <Button variant="ghost" className="mb-4" onClick={() => navigate('/pacientes')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
      </Button>

      <Card className="mb-6">
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
            <Button variant="outline" size="sm" onClick={() => pacientesApi.export(p.id)}>
              <Download className="mr-2 h-4 w-4" /> Exportar (LGPD)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="dados">
            <TabsList>
              <TabsTrigger value="dados">Dados cadastrais</TabsTrigger>
              <TabsTrigger value="prontuarios">Prontuários</TabsTrigger>
              <TabsTrigger value="agenda">Histórico de agenda</TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 glass rounded-xl p-4">
                <DescItem label="Nome" value={p.nome} />
                <DescItem label="CPF" value={formatCpf(p.cpf)} />
                <DescItem label="Nascimento" value={p.dataNascimento ? dayjs(p.dataNascimento).format('DD/MM/YYYY') : '—'} />
                <DescItem label="Sexo" value={p.sexo ? SEXO_LABEL[p.sexo as Sexo] : '—'} />
                <DescItem label="Telefone" value={p.telefone || '—'} />
                <DescItem label="E-mail" value={p.email || '—'} />
              </div>
            </TabsContent>

            <TabsContent value="prontuarios" className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">Clique em um atendimento para abrir o prontuário.</p>
                <Button size="sm" onClick={() => setNovoOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Novo atendimento
                </Button>
              </div>
              {prontQ.isLoading ? (
                <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {toItems<Prontuario>(prontQ.data as never).map((pr) => (
                      <TableRow key={pr.id} className="cursor-pointer" onClick={() => setViewProntuarioId(pr.id)}>
                        <TableCell>{pr.dataAtendimento ? dayjs(pr.dataAtendimento).format('DD/MM/YYYY HH:mm') : '—'}</TableCell>
                        <TableCell>{TIPO_ATENDIMENTO_LABEL[pr.tipo] ?? pr.tipo}</TableCell>
                        <TableCell>
                          <Badge variant={pr.assinado ? 'success' : 'warning'}>{pr.assinado ? 'Assinado' : 'Rascunho'}</Badge>
                        </TableCell>
                        <TableCell><FileText className="h-4 w-4 text-muted-foreground" /></TableCell>
                      </TableRow>
                    ))}
                    {toItems<Prontuario>(prontQ.data as never).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nenhum atendimento registrado. Clique em “Novo atendimento” para abrir a ficha.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="agenda" className="mt-4">
              {agendaQ.isLoading ? (
                <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Início</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {toItems<Agendamento>(agendaQ.data as never).map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{dayjs(a.dataHoraInicio).format('DD/MM/YYYY HH:mm')}</TableCell>
                        <TableCell>
                          <Badge>{STATUS_AGENDAMENTO_LABEL[a.status] ?? a.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <ProntuarioDetailDialog
        prontuarioId={viewProntuarioId}
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
