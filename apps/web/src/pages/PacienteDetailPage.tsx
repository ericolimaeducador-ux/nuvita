import { useMemo, useState } from 'react';
import { useSaidaProtegida } from '@/lib/saida-protegida';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import {
  ArrowLeft, User, Download, Plus, FileText,
  CalendarClock, ChevronDown, Stethoscope,
  Trash2, Pencil, FileSignature, ClipboardCheck, ShieldAlert,
} from 'lucide-react';
import { ProntuarioDetailDialog } from '@/components/ProntuarioDialogs';
import { NovoDocumentoDialog } from '@/components/NovoDocumentoDialog';
import {
  CorrigirIdentidadeDialog,
  SolicitarCorrecaoDialog,
  TicketsDoPaciente,
} from '@/components/CorrecaoIdentidadeDialogs';
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary';
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
  observacoesPacienteApi, testesPsicologicosApi,
  type TestePsicologico,
} from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { formatCpf, formatData, idade, toItems, formatEndereco } from '@/utils';
import { ErroConsulta } from '@/components/ErroConsulta';
import { classificarErro } from '@/lib/consulta';
import { classificarIdadePorString } from '@/paciente-idade';
import {
  Sexo, SEXO_LABEL, ProjetoPaciente, PROJETO_LABEL, STATUS_AGENDAMENTO_LABEL, TIPO_ATENDIMENTO_LABEL,
  Papel, TIPO_DOCUMENTO_LABEL, LinhaTerapeutica, LINHA_TERAPEUTICA_LABEL,
  type Agendamento, type Prontuario, type Documento, type Paciente,
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
  const qc = useQueryClient();
  const { user } = useAuth();
  // Psicólogo atende fora do fluxo clínico da Mais Quali Vida: só enxerga
  // dados cadastrais, os próprios atendimentos (psicoterapia) e documentos.
  const ehPsicologo = user?.papel === Papel.PSICOLOGO;
  const [viewProntuarioId, setViewProntuarioId] = useState<string | null>(null);
  const [novoDocOpen, setNovoDocOpen] = useState(false);
  const [docParaExcluir, setDocParaExcluir] = useState<Documento | null>(null);

  const pacQ = useQuery({ queryKey: ['paciente', id], queryFn: () => pacientesApi.get(id), enabled: !!id });
  const prontQ = useQuery({ queryKey: ['prontuarios', 'paciente', id], queryFn: () => prontuariosApi.list({ pacienteId: id }), enabled: !!id });
  const agendaQ = useQuery({ queryKey: ['agenda', 'paciente', id], queryFn: () => agendaApi.list({ pacienteId: id }), enabled: !!id });
  const docsQ = useQuery({ queryKey: ['documentos', 'paciente', id], queryFn: () => documentosApi.list({ pacienteId: id }), enabled: !!id });
  const excluirDocMut = useMutation({
    mutationFn: (docId: string) => documentosApi.excluir(docId),
    onSuccess: () => {
      toast.success('Documento excluído.');
      setDocParaExcluir(null);
      void qc.invalidateQueries({ queryKey: ['documentos', 'paciente', id] });
    },
    onError: (e) => toast.error('Erro ao excluir', apiErrorMessage(e)),
  });
  // Export LGPD: mesmos papéis autorizados no backend (GET /pacientes/:id/export): não é da secretária.
  const podeExportar = user?.papel === Papel.PSICOLOGO || user?.papel === Papel.ADMIN;

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

  if (pacQ.isLoading) return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  // Só 404 significa "não encontrado"; 403/500/rede usam ErroConsulta (não podem parecer paciente inexistente).
  if (pacQ.isError || !pacQ.data) {
    const naoEncontrado = pacQ.isError && classificarErro(pacQ.error).tipo === 'nao-encontrado';
    return (
      <div className="p-6 text-center">
        {naoEncontrado ? (
          <p className="text-lg font-semibold text-foreground mb-4">Paciente não encontrado</p>
        ) : (
          <ErroConsulta
            className="mb-4 justify-center"
            erro={pacQ.error}
            refetch={pacQ.refetch}
            recurso="os dados do paciente"
          />
        )}
        <Button onClick={() => navigate('/pacientes')}>Voltar para Pacientes</Button>
      </div>
    );
  }

  const p = pacQ.data;
  const classificacaoIdade = classificarIdadePorString(p.dataNascimento);

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
                {classificacaoIdade === 'menor' && <Badge variant="warning">Menor de idade</Badge>}
                <Badge variant={p.ativo === false ? 'secondary' : 'success'}>
                  {p.ativo === false ? 'Inativo' : 'Ativo'}
                </Badge>
              </div>
            </div>
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

      {/* Aviso não bloqueante — sem data de nascimento não dá para saber se o
          paciente é menor de idade (regra de responsável legal, Fase 2). */}
      {classificacaoIdade === 'indeterminado' && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-700">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Data de nascimento não informada — complete o cadastro no próximo atendimento para verificar se o paciente é menor de idade.</p>
        </div>
      )}

      {/* Dados cadastrais */}
      <SectionErrorBoundary secao="Dados cadastrais">
        <DadosCadastraisSecao paciente={p} pacienteId={id} />
      </SectionErrorBoundary>

      {/* Prontuários / atendimentos */}
      <Secao
        icon={<Stethoscope className="h-4 w-4" />}
        titulo="Prontuários e atendimentos"
        contagem={prontQ.isError ? undefined : prontuarios.length}
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
        ) : prontQ.isError ? (
          <ErroConsulta erro={prontQ.error} refetch={prontQ.refetch} recurso="os atendimentos deste paciente" />
        ) : prontuarios.length === 0 ? (
          <Vazio>Nenhum atendimento registrado ainda.</Vazio>
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
                    <Badge variant={pr.assinado ? 'success' : 'warning'}>{pr.assinado ? 'Assinado' : 'Rascunho'}</Badge>
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

      {/* Declaração de comparecimento: documento administrativo (só presença, data/hora da agenda). */}
      {(ehPsicologo || user?.papel === Papel.SECRETARIA || user?.papel === Papel.ADMIN) && (
        <Secao icon={<FileSignature className="h-4 w-4" />} titulo="Declaração de comparecimento" defaultOpen={false}>
          <Button variant="outline" size="sm" onClick={() => navigate(`/pacientes/${id}/documentos/declaracao-comparecimento`)}>
            Emitir declaração de comparecimento
          </Button>
        </Secao>
      )}

      {/* Documentos clínicos — emissão de atestado/laudo/encaminhamento/prescrição,
          distinto da seção "Documentos" abaixo (que é upload de arquivo). */}
      {ehPsicologo && (
        <Secao icon={<FileSignature className="h-4 w-4" />} titulo="Documentos clínicos" defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/pacientes/${id}/documentos/atestado`)}>
              Atestado de comparecimento
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/pacientes/${id}/documentos/laudo`)}>
              Laudo psicoterápico
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/pacientes/${id}/documentos/encaminhamento`)}>
              Encaminhamento
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/pacientes/${id}/documentos/prescricao`)}>
              Prescrição de cuidados
            </Button>
          </div>
        </Secao>
      )}

      {/* Testes psicológicos — placeholder: sem catálogo de testes ainda,
          nome do teste é texto livre. Estrutura pronta pra receber conteúdo depois. */}
      {ehPsicologo && <TestesPsicologicosSecao pacienteId={id} />}

      {/* Observações gerais — campo livre p/ qualquer profissional de atendimento (fora do escopo do psicólogo) */}
      {!ehPsicologo && <ObservacoesSecao pacienteId={id} observacoesAtuais={p.observacoes} />}

      {/* Documentos */}
      <Secao
        icon={<FileText className="h-4 w-4" />}
        titulo="Documentos"
        contagem={docsQ.isError ? undefined : toItems<Documento>(docsQ.data as never).length}
        defaultOpen={false}
        acao={
          <Button size="sm" variant="outline" onClick={() => setNovoDocOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo documento
          </Button>
        }
      >
        {docsQ.isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : docsQ.isError ? (
          <ErroConsulta erro={docsQ.error} refetch={docsQ.refetch} recurso="os documentos deste paciente" />
        ) : toItems<Documento>(docsQ.data as never).length === 0 ? (
          <Vazio>Nenhum documento anexado.</Vazio>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead>Data</TableHead><TableHead className="w-32 text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {toItems<Documento>(docsQ.data as never).map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{d.tipo ? TIPO_DOCUMENTO_LABEL[d.tipo] : '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{d.criadoEm ? dayjs(d.criadoEm).format('DD/MM/YYYY') : '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={async () => {
                        const r = await documentosApi.accessUrl(d.id);
                        if (r?.accessUrl) window.open(r.accessUrl, '_blank');
                      }}>Abrir</Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        title="Excluir documento"
                        onClick={() => setDocParaExcluir(d)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Secao>

      {/* Histórico de agenda — fora do escopo do psicólogo (agenda dele fica em Atendimento Psicológico) */}
      {!ehPsicologo && (
        <Secao icon={<CalendarClock className="h-4 w-4" />} titulo="Histórico de agenda" contagem={agendaQ.isError ? undefined : toItems<Agendamento>(agendaQ.data as never).length} defaultOpen={false}>
          {agendaQ.isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : agendaQ.isError ? (
            <ErroConsulta erro={agendaQ.error} refetch={agendaQ.refetch} recurso="o histórico de agenda" />
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
      )}

      <ProntuarioDetailDialog
        prontuarioId={viewProntuarioId}
        pacienteId={id}
        open={!!viewProntuarioId}
        onOpenChange={(o) => { if (!o) setViewProntuarioId(null); }}
      />
      <NovoDocumentoDialog
        pacienteId={id}
        pacienteNome={p.nome}
        open={novoDocOpen}
        onOpenChange={setNovoDocOpen}
      />
      <Dialog open={!!docParaExcluir} onOpenChange={(o) => { if (!o) setDocParaExcluir(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir documento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir <span className="font-medium text-foreground">{docParaExcluir?.nome}</span>?
            O arquivo será removido do armazenamento e esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDocParaExcluir(null)} disabled={excluirDocMut.isPending}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => docParaExcluir && excluirDocMut.mutate(docParaExcluir.id)}
              disabled={excluirDocMut.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" /> {excluirDocMut.isPending ? 'Excluindo…' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const editPacienteSchema = z.object({
  nome: z.string().optional(),
  cpf: z.string().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF inválido.').optional().or(z.literal('')),
  dataNascimento: z.string().optional(),
  sexo: z.nativeEnum(Sexo).optional().or(z.literal('')),
  projeto: z.nativeEnum(ProjetoPaciente).optional().or(z.literal('')),
  linhaTerapeutica: z.nativeEnum(LinhaTerapeutica).optional().or(z.literal('')),
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
  const { user } = useAuth();
  // Psicólogo só cuida de pacientes do Projeto PSI — trava o campo em vez de
  // expor o seletor (evita que o paciente suma da lista dele por engano).
  const ehPsicologo = user?.papel === Papel.PSICOLOGO;
  // Nome, CPF e nascimento não se editam aqui (feature-correcao-identidade-paciente): só o
  // SUPER_ADMIN corrige, com justificativa; os demais papéis abrem um ticket.
  const ehSuperAdmin = user?.papel === Papel.SUPER_ADMIN;
  const [open, setOpen] = useState(false);
  const [solicitarOpen, setSolicitarOpen] = useState(false);
  const [corrigirOpen, setCorrigirOpen] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isDirty } } = useForm<EditPacienteForm>({
    resolver: zodResolver(editPacienteSchema),
  });

  function abrir() {
    reset({
      nome: p.nome,
      cpf: p.cpf ?? '',
      dataNascimento: p.dataNascimento ? p.dataNascimento.slice(0, 10) : '',
      sexo: p.sexo ?? '',
      projeto: ehPsicologo ? ProjetoPaciente.PSI : (p.projeto ?? ''),
      linhaTerapeutica: p.linhaTerapeutica ?? '',
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

  // Clique fora/ESC não fecham; Cancelar com edição pendente pede confirmação.
  const saida = useSaidaProtegida(isDirty, () => setOpen(false));

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
      sexo: v.sexo || undefined,
      projeto: v.projeto || undefined,
      linhaTerapeutica: v.linhaTerapeutica || undefined,
      telefone: v.telefone || undefined,
      email: v.email || undefined,
      endereco: temEndereco ? enderecoCampos : undefined,
      consentimentoLGPD: v.consentimento
        ? { aceito: true, dataAceite: p.consentimentoLGPD?.aceito ? p.consentimentoLGPD.dataAceite : new Date().toISOString(), versao: '1.0' }
        : undefined,
    });
  }

  return (
    <>
      <Secao
        icon={<User className="h-4 w-4" />}
        titulo="Dados cadastrais"
        defaultOpen={false}
        acao={
          ehSuperAdmin ? (
            <Button variant="outline" size="sm" onClick={() => setCorrigirOpen(true)}>
              Corrigir identidade
            </Button>
          ) : (
            <Button variant="ghost" size="icon" title="Editar cadastro" onClick={abrir}>
              <Pencil className="h-4 w-4" />
            </Button>
          )
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 glass rounded-xl p-4">
          <DescItem label="Nome" value={p.nome} />
          <DescItem label="ID do paciente" value={pacienteId} />
          <DescItem label="CPF" value={formatCpf(p.cpf)} />
          <DescItem label="Nascimento" value={formatData(p.dataNascimento)} />
          <DescItem label="Sexo" value={p.sexo ? SEXO_LABEL[p.sexo] : '—'} />
          <DescItem label="Projeto" value={p.projeto ? PROJETO_LABEL[p.projeto] : '—'} />
          <DescItem label="Linha terapêutica" value={p.linhaTerapeutica ? LINHA_TERAPEUTICA_LABEL[p.linhaTerapeutica] : '—'} />
          <DescItem label="Telefone" value={p.telefone || '—'} />
          <DescItem label="E-mail" value={p.email || '—'} />
          <DescItem label="Consentimento LGPD" value={p.consentimentoLGPD?.aceito ? 'Aceito' : 'Pendente'} />
          <div className="col-span-2 sm:col-span-3">
            <DescItem label="Endereço" value={formatEndereco(p.endereco)} />
          </div>
          {/* Só aparece quando há responsável legal cadastrado (paciente menor —
              ver cadastro em PacientesPage.tsx). Sem edição aqui ainda nesta rodada;
              a API já aceita PATCH com os mesmos campos, se precisar no futuro. */}
          {p.responsavelLegal && (
            <>
              <DescItem label="Responsável legal" value={p.responsavelLegal.nome || '—'} />
              <DescItem label="CPF do responsável" value={formatCpf(p.responsavelLegal.cpf)} />
              <DescItem label="Telefone do responsável" value={p.responsavelLegal.telefone || '—'} />
              <DescItem label="E-mail do responsável" value={p.responsavelLegal.email || '—'} />
              <DescItem label="Vínculo" value={p.responsavelLegal.vinculo || '—'} />
              <DescItem
                label="Autorização do responsável"
                value={
                  p.autorizacaoResponsavel?.confirmado
                    ? `Confirmada${p.autorizacaoResponsavel.registradaEm ? ' em ' + dayjs(p.autorizacaoResponsavel.registradaEm).format('DD/MM/YYYY HH:mm') : ''}`
                    : 'Pendente'
                }
              />
            </>
          )}
        </div>

        <TicketsDoPaciente pacienteId={pacienteId} />
      </Secao>
      <SolicitarCorrecaoDialog open={solicitarOpen} onOpenChange={setSolicitarOpen} pacienteId={pacienteId} />
      <CorrigirIdentidadeDialog open={corrigirOpen} onOpenChange={setCorrigirOpen} pacienteId={pacienteId} />
      <Dialog open={open} onOpenChange={saida.onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" {...saida.contentProps}>
          <DialogHeader>
            <DialogTitle>Editar cadastro</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted p-3 text-sm">
              <span className="text-muted-foreground">Nome, CPF e nascimento só podem ser corrigidos pelo administrador da plataforma.</span>
              <Button type="button" variant="outline" size="sm" onClick={() => {
                  if (isDirty && !window.confirm('Você tem alterações não salvas. Descartar e continuar?')) return;
                  setOpen(false);
                  setSolicitarOpen(true);
                }}>
                Solicitar correção
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editNome">Nome</Label>
              <Input id="editNome" disabled {...register('nome')} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="editCpf">CPF</Label>
                <Input id="editCpf" placeholder="000.000.000-00" disabled {...register('cpf')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDataNascimento">Nascimento</Label>
                <Input id="editDataNascimento" type="date" disabled {...register('dataNascimento')} />
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

            {!ehPsicologo && (
              <div className="space-y-2">
                <Label>Projeto</Label>
                <Select value={watch('projeto') || undefined} onValueChange={(v) => setValue('projeto', v as ProjetoPaciente)}>
                  <SelectTrigger><SelectValue placeholder="Sem projeto" /></SelectTrigger>
                  <SelectContent>
                    {Object.values(ProjetoPaciente).map((pj) => <SelectItem key={pj} value={pj}>{PROJETO_LABEL[pj]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Linha terapêutica</Label>
              <Select value={watch('linhaTerapeutica') || undefined} onValueChange={(v) => setValue('linhaTerapeutica', v as LinhaTerapeutica)}>
                <SelectTrigger><SelectValue placeholder="Sem classificação" /></SelectTrigger>
                <SelectContent>
                  {Object.values(LinhaTerapeutica).map((lt) => (
                    <SelectItem key={lt} value={lt}>{LINHA_TERAPEUTICA_LABEL[lt]}</SelectItem>
                  ))}
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
              <Button type="button" variant="outline" onClick={saida.solicitarFechar}>Cancelar</Button>
              <Button type="submit" disabled={updateMut.isPending}>{updateMut.isPending ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
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
      contagem={listQ.isError ? undefined : observacoes.length + (legado ? 1 : 0)}
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
        ) : listQ.isError ? (
          <ErroConsulta erro={listQ.error} refetch={listQ.refetch} recurso="as observações" />
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

/**
 * Testes psicológicos aplicados ao paciente — placeholder sem catálogo de
 * testes ainda (nome do teste é texto livre); a estrutura de dados e o
 * endpoint já estão prontos para receber um catálogo padronizado depois.
 */
function TestesPsicologicosSecao({ pacienteId }: { pacienteId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nomeTeste, setNomeTeste] = useState('');
  const [dataAplicacao, setDataAplicacao] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [resultado, setResultado] = useState('');
  const saida = useSaidaProtegida(!!nomeTeste.trim() || !!resultado.trim(), () => {
    setOpen(false);
    setNomeTeste('');
    setDataAplicacao(dayjs().format('YYYY-MM-DD'));
    setResultado('');
  });

  const listQ = useQuery({
    queryKey: ['testes-psicologicos', pacienteId],
    queryFn: () => testesPsicologicosApi.listByPaciente(pacienteId),
  });

  const createMut = useMutation({
    mutationFn: () =>
      testesPsicologicosApi.create({
        pacienteId,
        nomeTeste: nomeTeste.trim(),
        dataAplicacao: dayjs(dataAplicacao).toISOString(),
        resultado: resultado.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Teste registrado.');
      setOpen(false);
      setNomeTeste('');
      setDataAplicacao(dayjs().format('YYYY-MM-DD'));
      setResultado('');
      void qc.invalidateQueries({ queryKey: ['testes-psicologicos', pacienteId] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const testes = toItems<TestePsicologico>(listQ.data as never);

  return (
    <>
    <Secao
      icon={<ClipboardCheck className="h-4 w-4" />}
      titulo="Testes Psicológicos"
      contagem={listQ.isError ? undefined : testes.length}
      defaultOpen={false}
      acao={
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Aplicar teste
        </Button>
      }
    >
      {listQ.isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : listQ.isError ? (
        <ErroConsulta erro={listQ.error} refetch={listQ.refetch} recurso="os testes psicológicos" />
      ) : testes.length === 0 ? (
        <Vazio>Nenhum teste aplicado ainda.</Vazio>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Teste</TableHead>
              <TableHead>Resultado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {testes.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{dayjs(t.dataAplicacao).format('DD/MM/YYYY')}</TableCell>
                <TableCell className="font-medium">{t.nomeTeste}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{t.resultado || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

    </Secao>
    {/* Dialog fora do Secao: o clique em "Aplicar teste" abre mesmo com a seção recolhida, e recolher não o desmonta. */}
      <Dialog open={open} onOpenChange={saida.onOpenChange}>
        <DialogContent className="max-w-md" {...saida.contentProps}>
          <DialogHeader>
            <DialogTitle>Aplicar teste psicológico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nomeTeste">Nome do teste</Label>
              <Input
                id="nomeTeste" placeholder="Ex.: BDI-II, BAI, WAIS-III…"
                value={nomeTeste} onChange={(e) => setNomeTeste(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dataAplicacaoTeste">Data de aplicação</Label>
              <Input
                id="dataAplicacaoTeste" type="date"
                value={dataAplicacao} onChange={(e) => setDataAplicacao(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resultadoTeste">Resultado (opcional)</Label>
              <Textarea
                id="resultadoTeste" rows={4} placeholder="Escore, interpretação, observações…"
                value={resultado} onChange={(e) => setResultado(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={saida.solicitarFechar}>Cancelar</Button>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!nomeTeste.trim() || !dataAplicacao || createMut.isPending}
            >
              {createMut.isPending ? 'Salvando…' : 'Registrar teste'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
