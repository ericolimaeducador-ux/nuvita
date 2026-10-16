import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Shield, Plus, Search, KeyRound, Pencil, ChevronLeft, ChevronRight, RefreshCw, RotateCcw, Building2,
  ShieldCheck, Copy,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { superAdminApi } from '@/api/resources';
import type { CreateAdminUserPayload, UpdateUsuarioPayload, ClinicaAdmin, TwoFactorSetup } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import {
  Modulo, MODULO_LABEL, TODOS_MODULOS, PERMISSOES_PADRAO_POR_PAPEL,
  resolvePermissoes, Papel, PAPEL_LABEL, registroLabel, papelTemRegistro,
} from '@/types';
import type { UsuarioAdmin } from '@/types';
import { documentoFiscalValido, formatarDocumentoFiscal, TipoDocumentoFiscal } from '@/lib/documento-fiscal';
import { SegredoDoisFatores } from '@/components/SegredoDoisFatores';

const PAPEL_BADGE: Record<Papel, string> = {
  [Papel.SUPER_ADMIN]: 'bg-purple-500/10 text-purple-600 border border-purple-500/20',
  [Papel.ADMIN]: 'bg-blue-500/10 text-blue-600 border border-blue-500/20',
  [Papel.PSICOLOGO]: 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
  [Papel.SECRETARIA]: 'bg-slate-500/10 text-slate-600 border border-slate-500/20',
  [Papel.PACIENTE]: 'bg-gray-500/10 text-gray-400 border border-gray-500/20',
};

const TODOS_PAPEIS = Object.values(Papel);
const LIMIT = 20;

// ---- Schemas ----------------------------------------------------------------
const createSchema = z.object({
  nome: z.string().min(1, 'Informe o nome.'),
  email: z.string().email('E-mail inválido.'),
  password: z.string().min(10, 'Mínimo 10 caracteres.'),
  papel: z.nativeEnum(Papel, { message: 'Selecione um perfil.' }),
  clinicaId: z.string().optional(),
  registroProfissional: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

const editSchema = z.object({
  nome: z.string().min(1, 'Informe o nome.'),
  email: z.string().email('E-mail inválido.'),
  papel: z.nativeEnum(Papel, { message: 'Selecione um perfil.' }),
  clinicaId: z.string().optional(),
  ativo: z.boolean(),
  registroProfissional: z.string().optional(),
});
type EditForm = z.infer<typeof editSchema>;

const resetSchema = z.object({
  novaSenha: z.string().min(10, 'Mínimo 10 caracteres.'),
});
type ResetForm = z.infer<typeof resetSchema>;

const clinicaSchema = z.object({
  nome: z.string().min(1, 'Informe o nome.'),
  plano: z.enum(['basico', 'profissional', 'enterprise']),
  ativo: z.boolean(),
  // Teste beta: enquanto marcada, os usuários aceitam o Termo de Teste. Desmarcar no
  // lançamento faz todos aceitarem os Termos de Uso no próximo acesso.
  faseTeste: z.boolean(),
});
type ClinicaForm = z.infer<typeof clinicaSchema>;

// Campos mínimos p/ criar clínica + 1º admin pela UI (mesmos da CLI bootstrap-admin).
// A senha do admin NÃO é digitada aqui — é gerada no backend.
const novaClinicaSchema = z
  .object({
  nome: z.string().min(1, 'Informe o nome.'),
  // CPF: profissional que atende como pessoa física. CNPJ: empresa (aceita o alfanumérico).
  tipoDocumento: z.nativeEnum(TipoDocumentoFiscal),
  documento: z.string().min(1, 'Informe o documento.'),
  plano: z.enum(['basico', 'profissional', 'enterprise']),
  fusoHorario: z.string().min(1, 'Informe o fuso horário.'),
  duracaoConsultaPadrao: z
    .string()
    .refine((s) => Number.isInteger(Number(s)) && Number(s) >= 5, 'Mínimo de 5 minutos.'),
  adminNome: z.string().min(1, 'Informe o nome do admin.'),
  adminEmail: z.string().email('E-mail inválido.'),
  // Sem valor padrão: o super-admin precisa escolher Sim ou Não (esquecer a marcação no lançamento
  // colocaria o Termo de Teste na frente de clientes reais).
  faseTeste: z.boolean({ message: 'Escolha se é clínica do teste beta.' }),
  })
  .superRefine((v, ctx) => {
    if (!documentoFiscalValido(v.tipoDocumento, v.documento)) {
      ctx.addIssue({ code: 'custom', path: ['documento'], message: `${v.tipoDocumento} inválido. Confira os números.` });
    }
  });
type NovaClinicaForm = z.infer<typeof novaClinicaSchema>;

const PLANO_LABEL: Record<ClinicaAdmin['plano'], string> = {
  basico: 'Básico',
  profissional: 'Profissional',
  enterprise: 'Enterprise',
};

// Radix Select não aceita value="" — sentinela para "sem clínica".
const SEM_CLINICA = 'none';

// Espelha PAPEIS_COM_2FA_OBRIGATORIO do backend (packages/shared/src/auth).
const PAPEIS_2FA: Papel[] = [Papel.SUPER_ADMIN, Papel.ADMIN, Papel.PSICOLOGO];

// ---- Component --------------------------------------------------------------
export function SuperAdminPage() {
  const qc = useQueryClient();

  // Filtros
  const [search, setSearch] = useState('');
  const [filterPapel, setFilterPapel] = useState<Papel | 'todos'>('todos');
  const [filterAtivo, setFilterAtivo] = useState<'todos' | 'true' | 'false'>('todos');
  const [skip, setSkip] = useState(0);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UsuarioAdmin | null>(null);
  const [resetTarget, setResetTarget] = useState<UsuarioAdmin | null>(null);
  const [clinicaTarget, setClinicaTarget] = useState<ClinicaAdmin | null>(null);
  const [novaClinicaOpen, setNovaClinicaOpen] = useState(false);
  // Segredos da clínica recém-criada, exibidos UMA vez (senha temporária + chave 2FA do admin).
  const [segredosClinica, setSegredosClinica] = useState<{
    clinicaNome: string;
    adminEmail: string;
    senhaTemporaria: string;
    base32: string | null;
    otpauthUrl: string | null;
  } | null>(null);
  // Chave TOTP recém-gerada, exibida uma única vez para cadastrar no autenticador.
  const [twoFaSetup, setTwoFaSetup] = useState<{ email: string; setup: TwoFactorSetup } | null>(null);
  const [twoFaTarget, setTwoFaTarget] = useState<UsuarioAdmin | null>(null);

  // Módulos efetivamente marcados no editor de permissões
  const [modulosSel, setModulosSel] = useState<Modulo[]>([]);

  // Forms
  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { papel: Papel.ADMIN },
  });
  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) });
  const resetForm = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });
  const clinicaForm = useForm<ClinicaForm>({ resolver: zodResolver(clinicaSchema) });
  const novaClinicaForm = useForm<NovaClinicaForm>({
    resolver: zodResolver(novaClinicaSchema),
    defaultValues: { tipoDocumento: TipoDocumentoFiscal.CNPJ, plano: 'basico', fusoHorario: 'America/Sao_Paulo', duracaoConsultaPadrao: '50' },
  });

  // Query params
  const queryParams = {
    search: search || undefined,
    papel: filterPapel === 'todos' ? undefined : filterPapel,
    ativo: filterAtivo === 'todos' ? undefined : filterAtivo === 'true',
    skip,
    limit: LIMIT,
  };

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['super-admin', 'usuarios', queryParams],
    queryFn: () => superAdminApi.listUsuarios(queryParams),
    placeholderData: (prev) => prev,
  });

  // Lista de clínicas: alimenta a aba Clínicas e os dropdowns de vínculo dos usuários.
  const { data: clinicasData, isFetching: clinicasFetching } = useQuery({
    queryKey: ['super-admin', 'clinicas'],
    queryFn: () => superAdminApi.listClinicas(),
  });
  const clinicas = clinicasData?.items ?? [];
  const clinicaNome = (id?: string | null) =>
    id ? clinicas.find((c) => c.id === id)?.nome ?? id : null;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['super-admin', 'usuarios'] });

  const createMut = useMutation({
    mutationFn: (payload: CreateAdminUserPayload) => superAdminApi.createUsuario(payload),
    onSuccess: (created) => {
      toast.success('Usuário criado com sucesso.');
      setCreateOpen(false);
      createForm.reset();
      void invalidate();
      // Papel com 2FA obrigatório nasce com segredo TOTP — exibe a chave agora,
      // senão ela se perde e o usuário não consegue logar.
      if (created.twoFactorSetup) {
        setTwoFaSetup({ email: created.email, setup: created.twoFactorSetup });
      }
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const editMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUsuarioPayload }) =>
      superAdminApi.updateUsuario(id, payload),
    onSuccess: (updated) => {
      toast.success('Usuário atualizado.');
      setEditTarget(null);
      void invalidate();
      if (updated.twoFactorSetup) {
        setTwoFaSetup({ email: updated.email, setup: updated.twoFactorSetup });
      }
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const resetMut = useMutation({
    mutationFn: ({ id, novaSenha }: { id: string; novaSenha: string }) =>
      superAdminApi.resetPassword(id, novaSenha),
    onSuccess: () => {
      toast.success('Senha redefinida com sucesso.');
      setResetTarget(null);
      resetForm.reset();
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const reset2faMut = useMutation({
    mutationFn: (u: UsuarioAdmin) => superAdminApi.reset2fa(u.id),
    onSuccess: (setup, u) => {
      setTwoFaTarget(null);
      setTwoFaSetup({ email: u.email, setup });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const clinicaMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ClinicaForm }) =>
      superAdminApi.updateClinica(id, payload),
    onSuccess: () => {
      toast.success('Clínica atualizada.');
      setClinicaTarget(null);
      void qc.invalidateQueries({ queryKey: ['super-admin', 'clinicas'] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const criarClinicaMut = useMutation({
    mutationFn: (v: NovaClinicaForm) =>
      superAdminApi.criarClinica({
        clinica: {
          nome: v.nome,
          tipoDocumento: v.tipoDocumento,
          documento: v.documento,
          plano: v.plano,
          fusoHorario: v.fusoHorario,
          duracaoConsultaPadrao: Number(v.duracaoConsultaPadrao),
          faseTeste: v.faseTeste,
        },
        primeiroAdmin: { nome: v.adminNome, email: v.adminEmail },
      }),
    onSuccess: (res) => {
      setNovaClinicaOpen(false);
      novaClinicaForm.reset();
      setSegredosClinica({
        clinicaNome: res.clinica.nome,
        adminEmail: res.admin.email,
        senhaTemporaria: res.senhaTemporaria,
        base32: res.twoFactorSetup?.base32 ?? null,
        otpauthUrl: res.twoFactorSetup?.otpauthUrl ?? null,
      });
      void qc.invalidateQueries({ queryKey: ['super-admin', 'clinicas'] });
    },
    onError: (e) => toast.error('Erro ao criar clínica', apiErrorMessage(e)),
  });

  function openEditClinica(c: ClinicaAdmin) {
    setClinicaTarget(c);
    clinicaForm.reset({ nome: c.nome, plano: c.plano, ativo: c.ativo, faseTeste: c.faseTeste ?? false });
  }

  function openEdit(u: UsuarioAdmin) {
    setEditTarget(u);
    editForm.reset({ nome: u.nome, email: u.email, papel: u.papel, clinicaId: u.clinicaId ?? '', ativo: u.ativo, registroProfissional: u.registroProfissional ?? '' });
    // permissoes vem da API; fallback recalcula para respostas antigas em cache
    setModulosSel(u.permissoes ?? resolvePermissoes(u.papel, u.modulosConcedidos, u.modulosRevogados));
  }

  function toggleModulo(m: Modulo, checked: boolean) {
    setModulosSel((prev) => (checked ? [...prev, m] : prev.filter((x) => x !== m)));
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') setSkip(0);
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(skip / LIMIT) + 1;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Super Admin"
        subtitle="Gerencie todos os usuários, acessos e permissões da plataforma"
      />

      <div className="flex items-start gap-3 glass rounded-xl p-4 border border-purple-500/20 bg-purple-500/5">
        <Shield className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Acesso irrestrito</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Aqui você cria usuários com qualquer papel, ativa/desativa contas, redefine senhas
            e vincula usuários a clínicas. Todas as ações são registradas no audit log.
          </p>
        </div>
      </div>

      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="clinicas">Clínicas</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4 space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nome ou e-mail…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSkip(0); }}
                onKeyDown={onSearchKeyDown}
              />
            </div>

            <Select value={filterPapel} onValueChange={(v) => { setFilterPapel(v as Papel | 'todos'); setSkip(0); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Todos os perfis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os perfis</SelectItem>
                {TODOS_PAPEIS.map((p) => <SelectItem key={p} value={p}>{PAPEL_LABEL[p]}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterAtivo} onValueChange={(v) => { setFilterAtivo(v as 'todos' | 'true' | 'false'); setSkip(0); }}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="true">Ativos</SelectItem>
                <SelectItem value="false">Inativos</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="ghost" size="icon" onClick={() => void refetch()} disabled={isFetching}>
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>

            <Button onClick={() => setCreateOpen(true)} className="ml-auto gap-2">
              <Plus className="h-4 w-4" />
              Novo usuário
            </Button>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Clínica</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                        {isFetching ? 'Carregando…' : 'Nenhum usuário encontrado.'}
                      </TableCell>
                    </TableRow>
                  )}
                  {items.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.nome}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PAPEL_BADGE[u.papel]}`}>
                          {PAPEL_LABEL[u.papel]}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {clinicaNome(u.clinicaId) ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.ativo ? 'default' : 'secondary'} className={u.ativo ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20'}>
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(u.criadoEm).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Editar" onClick={() => openEdit(u)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Redefinir senha" onClick={() => { setResetTarget(u); resetForm.reset(); }}>
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          {PAPEIS_2FA.includes(u.papel) && (
                            <Button variant="ghost" size="icon" title="Gerar chave 2FA" onClick={() => setTwoFaTarget(u)}>
                              <ShieldCheck className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {total > LIMIT && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{total} usuário{total !== 1 ? 's' : ''} · página {currentPage} de {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={skip === 0} onClick={() => setSkip(Math.max(0, skip - LIMIT))}>
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={skip + LIMIT >= total} onClick={() => setSkip(skip + LIMIT)}>
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="clinicas" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setNovaClinicaOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova clínica
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF / CNPJ</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Usuários</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criada em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clinicas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                        {clinicasFetching ? 'Carregando…' : 'Nenhuma clínica cadastrada.'}
                      </TableCell>
                    </TableRow>
                  )}
                  {clinicas.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {c.nome}
                          {c.faseTeste && (
                            <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 border border-amber-500/20" title="Usuários aceitam o Termo de Teste">
                              Teste beta
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <span className="text-xs mr-1.5">{c.tipoDocumento}</span>
                        <span className="font-mono">{formatarDocumentoFiscal(c.tipoDocumento as TipoDocumentoFiscal, c.documento)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{PLANO_LABEL[c.plano]}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{c.totalUsuarios}</TableCell>
                      <TableCell>
                        <Badge variant={c.ativo ? 'default' : 'secondary'} className={c.ativo ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20 hover:bg-red-500/20'}>
                          {c.ativo ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(c.criadoEm).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" title="Editar" onClick={() => openEditClinica(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Criar usuário */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo usuário</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit((v) =>
              createMut.mutate({ nome: v.nome, email: v.email, password: v.password, papel: v.papel, clinicaId: v.clinicaId || undefined, registroProfissional: papelTemRegistro(v.papel) ? (v.registroProfissional || undefined) : undefined })
            )}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Nome completo</Label>
                <Input placeholder="João da Silva" {...createForm.register('nome')} />
                {createForm.formState.errors.nome && (
                  <p className="text-xs text-destructive">{createForm.formState.errors.nome.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" placeholder="usuario@nuvita.com" {...createForm.register('email')} />
                {createForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{createForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Senha provisória</Label>
                <PasswordInput placeholder="mín. 10 caracteres" {...createForm.register('password')} />
                {createForm.formState.errors.password && (
                  <p className="text-xs text-destructive">{createForm.formState.errors.password.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Perfil</Label>
                <Select defaultValue={Papel.ADMIN} onValueChange={(v) => createForm.setValue('papel', v as Papel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TODOS_PAPEIS.map((p) => <SelectItem key={p} value={p}>{PAPEL_LABEL[p]}</SelectItem>)}
                  </SelectContent>
                </Select>
                {createForm.formState.errors.papel && (
                  <p className="text-xs text-destructive">{createForm.formState.errors.papel.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Clínica <span className="text-muted-foreground">(opcional)</span></Label>
                <Select
                  defaultValue={SEM_CLINICA}
                  onValueChange={(v) => createForm.setValue('clinicaId', v === SEM_CLINICA ? '' : v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SEM_CLINICA}>— Sem clínica —</SelectItem>
                    {clinicas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {papelTemRegistro(createForm.watch('papel')) && (
                <div className="col-span-2 space-y-1.5">
                  <Label>{registroLabel(createForm.watch('papel'))} <span className="text-muted-foreground">(opcional — preenche documentos automaticamente)</span></Label>
                  <Input placeholder={`Nº do ${registroLabel(createForm.watch('papel'))}`} {...createForm.register('registroProfissional')} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? 'Criando…' : 'Criar usuário'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar usuário */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null); }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar usuário — {editTarget?.email}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit((v) => {
              if (!editTarget) return;
              // Persistimos só as EXCEÇÕES em relação ao padrão do papel; assim,
              // mudanças futuras no padrão continuam valendo para quem não foi customizado.
              const padrao = PERMISSOES_PADRAO_POR_PAPEL[v.papel] ?? [];
              const payload: UpdateUsuarioPayload = {
                nome: v.nome,
                email: v.email,
                papel: v.papel,
                clinicaId: v.clinicaId || null,
                ativo: v.ativo,
                // Só faz sentido para papéis com conselho; limpa se o papel não tiver.
                registroProfissional: papelTemRegistro(v.papel) ? (v.registroProfissional || '') : '',
                modulosConcedidos: modulosSel.filter((m) => !padrao.includes(m)),
                modulosRevogados: padrao.filter((m) => !modulosSel.includes(m)),
              };
              editMut.mutate({ id: editTarget.id, payload });
            })}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Nome completo</Label>
                <Input {...editForm.register('nome')} />
                {editForm.formState.errors.nome && (
                  <p className="text-xs text-destructive">{editForm.formState.errors.nome.message}</p>
                )}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>E-mail <span className="text-muted-foreground">(login do usuário — alterar aqui recupera contas com e-mail antigo)</span></Label>
                <Input type="email" {...editForm.register('email')} />
                {editForm.formState.errors.email && (
                  <p className="text-xs text-destructive">{editForm.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Perfil</Label>
                <Select
                  value={editForm.watch('papel')}
                  onValueChange={(v) => {
                    editForm.setValue('papel', v as Papel);
                    // trocar de perfil recomeça do padrão do novo papel
                    setModulosSel(PERMISSOES_PADRAO_POR_PAPEL[v as Papel] ?? []);
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TODOS_PAPEIS.map((p) => <SelectItem key={p} value={p}>{PAPEL_LABEL[p]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={editForm.watch('ativo') ? 'true' : 'false'} onValueChange={(v) => editForm.setValue('ativo', v === 'true')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativo</SelectItem>
                    <SelectItem value="false">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Clínica <span className="text-muted-foreground">(mover o usuário troca a clínica em que ele atende)</span></Label>
                <Select
                  value={editForm.watch('clinicaId') || SEM_CLINICA}
                  onValueChange={(v) => editForm.setValue('clinicaId', v === SEM_CLINICA ? '' : v)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SEM_CLINICA}>— Sem clínica —</SelectItem>
                    {clinicas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {papelTemRegistro(editForm.watch('papel')) && (
                <div className="col-span-2 space-y-1.5">
                  <Label>{registroLabel(editForm.watch('papel'))} <span className="text-muted-foreground">(preenche assinatura de documentos automaticamente)</span></Label>
                  <Input placeholder={`Nº do ${registroLabel(editForm.watch('papel'))}`} {...editForm.register('registroProfissional')} />
                </div>
              )}

              {/* Permissões de módulos */}
              <div className="col-span-2 space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <Label>Módulos liberados</Label>
                  {editForm.watch('papel') !== Papel.SUPER_ADMIN && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1.5 text-xs text-muted-foreground"
                      onClick={() => setModulosSel(PERMISSOES_PADRAO_POR_PAPEL[editForm.watch('papel')] ?? [])}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Restaurar padrão do perfil
                    </Button>
                  )}
                </div>
                {editForm.watch('papel') === Papel.SUPER_ADMIN ? (
                  <p className="text-sm text-muted-foreground">
                    Super Admin sempre tem acesso total — as permissões não são editáveis.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {TODOS_MODULOS.filter((m) => m !== Modulo.SUPER_ADMIN).map((m) => (
                      <label key={m} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                        <Checkbox
                          checked={modulosSel.includes(m)}
                          onCheckedChange={(c) => toggleModulo(m, c === true)}
                        />
                        {MODULO_LABEL[m]}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditTarget(null)}>Cancelar</Button>
              <Button type="submit" disabled={editMut.isPending}>
                {editMut.isPending ? 'Salvando…' : 'Salvar alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Redefinir senha */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => { if (!o) setResetTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Redefinir senha</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Definindo nova senha para <span className="font-medium text-foreground">{resetTarget?.nome}</span> ({resetTarget?.email}).
          </p>
          <form
            onSubmit={resetForm.handleSubmit((v) => {
              if (!resetTarget) return;
              resetMut.mutate({ id: resetTarget.id, novaSenha: v.novaSenha });
            })}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Nova senha</Label>
              <PasswordInput placeholder="mín. 10 caracteres" {...resetForm.register('novaSenha')} />
              {resetForm.formState.errors.novaSenha && (
                <p className="text-xs text-destructive">{resetForm.formState.errors.novaSenha.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setResetTarget(null)}>Cancelar</Button>
              <Button type="submit" disabled={resetMut.isPending}>
                {resetMut.isPending ? 'Redefinindo…' : 'Redefinir senha'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: confirmar geração de nova chave 2FA */}
      <Dialog open={!!twoFaTarget} onOpenChange={(o) => { if (!o) setTwoFaTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar nova chave 2FA</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Será gerada uma nova chave para <span className="font-medium text-foreground">{twoFaTarget?.nome}</span> ({twoFaTarget?.email}).
            A chave anterior <span className="font-medium text-foreground">deixa de funcionar</span> — o usuário
            precisará cadastrar a nova no aplicativo autenticador.
          </p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setTwoFaTarget(null)}>Cancelar</Button>
            <Button
              type="button"
              disabled={reset2faMut.isPending}
              onClick={() => twoFaTarget && reset2faMut.mutate(twoFaTarget)}
            >
              {reset2faMut.isPending ? 'Gerando…' : 'Gerar nova chave'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: exibir chave 2FA recém-gerada (aparece uma única vez) */}
      <Dialog open={!!twoFaSetup} onOpenChange={(o) => { if (!o) setTwoFaSetup(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Chave 2FA — {twoFaSetup?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {twoFaSetup && (
              <SegredoDoisFatores base32={twoFaSetup.setup.base32} otpauthUrl={twoFaSetup.setup.otpauthUrl} />
            )}
            <p className="text-xs text-destructive">
              Esta chave não será exibida novamente — repasse ao usuário agora. Se ela se perder,
              gere outra pelo botão de escudo na lista de usuários.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setTwoFaSetup(null)}>Concluído</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar clínica */}
      <Dialog open={!!clinicaTarget} onOpenChange={(o) => { if (!o) setClinicaTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar clínica — {clinicaTarget?.nome}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={clinicaForm.handleSubmit((v) => {
              if (!clinicaTarget) return;
              clinicaMut.mutate({ id: clinicaTarget.id, payload: v });
            })}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input {...clinicaForm.register('nome')} />
              {clinicaForm.formState.errors.nome && (
                <p className="text-xs text-destructive">{clinicaForm.formState.errors.nome.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Plano</Label>
                <Select
                  value={clinicaForm.watch('plano')}
                  onValueChange={(v) => clinicaForm.setValue('plano', v as ClinicaForm['plano'])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PLANO_LABEL) as ClinicaAdmin['plano'][]).map((p) => (
                      <SelectItem key={p} value={p}>{PLANO_LABEL[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={clinicaForm.watch('ativo') ? 'true' : 'false'}
                  onValueChange={(v) => clinicaForm.setValue('ativo', v === 'true')}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Ativa</SelectItem>
                    <SelectItem value="false">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
              <Checkbox
                checked={clinicaForm.watch('faseTeste')}
                onCheckedChange={(c) => clinicaForm.setValue('faseTeste', c === true)}
              />
              <span>
                Clínica do teste beta
                <span className="block text-xs text-muted-foreground">
                  Marcada: os usuários aceitam o Termo de Teste. Ao desmarcar (lançamento), todos
                  passam a aceitar os Termos de Uso no próximo acesso.
                </span>
              </span>
            </label>
            <p className="text-xs text-muted-foreground">
              {clinicaTarget?.tipoDocumento ?? 'Documento'}:{' '}
              <span className="font-mono">
                {clinicaTarget ? formatarDocumentoFiscal(clinicaTarget.tipoDocumento as TipoDocumentoFiscal, clinicaTarget.documento) : ''}
              </span>{' '}
              (não editável)
            </p>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setClinicaTarget(null)}>Cancelar</Button>
              <Button type="submit" disabled={clinicaMut.isPending}>
                {clinicaMut.isPending ? 'Salvando…' : 'Salvar alterações'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nova clínica (cria clínica + 1º admin; senha gerada no backend) */}
      <Dialog open={novaClinicaOpen} onOpenChange={setNovaClinicaOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova clínica</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={novaClinicaForm.handleSubmit((v) => criarClinicaMut.mutate(v))}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Nome da clínica</Label>
                <Input {...novaClinicaForm.register('nome')} />
                {novaClinicaForm.formState.errors.nome && (
                  <p className="text-xs text-destructive">{novaClinicaForm.formState.errors.nome.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de documento</Label>
                <Select
                  defaultValue={TipoDocumentoFiscal.CNPJ}
                  onValueChange={(t) =>
                    novaClinicaForm.setValue('tipoDocumento', t as TipoDocumentoFiscal, { shouldValidate: novaClinicaForm.formState.isSubmitted })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TipoDocumentoFiscal.CNPJ}>CNPJ (empresa)</SelectItem>
                    <SelectItem value={TipoDocumentoFiscal.CPF}>CPF (pessoa física)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{novaClinicaForm.watch('tipoDocumento') === TipoDocumentoFiscal.CPF ? 'CPF' : 'CNPJ'}</Label>
                <Input
                  placeholder={novaClinicaForm.watch('tipoDocumento') === TipoDocumentoFiscal.CPF ? '000.000.000-00' : '00.000.000/0000-00'}
                  {...novaClinicaForm.register('documento')}
                />
                {novaClinicaForm.formState.errors.documento && (
                  <p className="text-xs text-destructive">{novaClinicaForm.formState.errors.documento.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Plano</Label>
                <Select
                  defaultValue="basico"
                  onValueChange={(p) => novaClinicaForm.setValue('plano', p as NovaClinicaForm['plano'])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PLANO_LABEL) as ClinicaAdmin['plano'][]).map((p) => (
                      <SelectItem key={p} value={p}>{PLANO_LABEL[p]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fuso horário</Label>
                <Input {...novaClinicaForm.register('fusoHorario')} />
                {novaClinicaForm.formState.errors.fusoHorario && (
                  <p className="text-xs text-destructive">{novaClinicaForm.formState.errors.fusoHorario.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Duração padrão da consulta (min)</Label>
                <Input type="number" {...novaClinicaForm.register('duracaoConsultaPadrao')} />
                {novaClinicaForm.formState.errors.duracaoConsultaPadrao && (
                  <p className="text-xs text-destructive">
                    {novaClinicaForm.formState.errors.duracaoConsultaPadrao.message}
                  </p>
                )}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Clínica do teste beta?</Label>
                <Select
                  onValueChange={(v) => novaClinicaForm.setValue('faseTeste', v === 'sim', { shouldValidate: true })}
                >
                  <SelectTrigger aria-label="Clínica do teste beta"><SelectValue placeholder="Escolha uma opção" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim — os usuários aceitam o Termo de Teste</SelectItem>
                    <SelectItem value="nao">Não — os usuários aceitam os Termos de Uso</SelectItem>
                  </SelectContent>
                </Select>
                {novaClinicaForm.formState.errors.faseTeste && (
                  <p className="text-xs text-destructive">{novaClinicaForm.formState.errors.faseTeste.message}</p>
                )}
              </div>
              <div className="col-span-2 border-t border-border pt-3 space-y-1">
                <p className="text-sm font-medium">Primeiro administrador da clínica</p>
                <p className="text-xs text-muted-foreground">
                  A senha é gerada automaticamente e exibida uma única vez após a criação.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Nome do admin</Label>
                <Input {...novaClinicaForm.register('adminNome')} />
                {novaClinicaForm.formState.errors.adminNome && (
                  <p className="text-xs text-destructive">{novaClinicaForm.formState.errors.adminNome.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>E-mail do admin</Label>
                <Input type="email" {...novaClinicaForm.register('adminEmail')} />
                {novaClinicaForm.formState.errors.adminEmail && (
                  <p className="text-xs text-destructive">{novaClinicaForm.formState.errors.adminEmail.message}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setNovaClinicaOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={criarClinicaMut.isPending}>
                {criarClinicaMut.isPending ? 'Criando…' : 'Criar clínica'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: segredos da clínica recém-criada (aparecem uma única vez) */}
      <Dialog open={!!segredosClinica} onOpenChange={(o) => { if (!o) setSegredosClinica(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Clínica criada — {segredosClinica?.clinicaNome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Repasse ao administrador (<span className="font-medium text-foreground">{segredosClinica?.adminEmail}</span>)
              por um canal privado. Ele será obrigado a trocar a senha no primeiro acesso.
            </p>

            <div className="space-y-1">
              <Label className="text-xs">Senha temporária</Label>
              <div className="flex items-center gap-2 rounded-md border border-border bg-secondary p-3">
                <code className="flex-1 text-sm font-mono break-all select-all">
                  {segredosClinica?.senhaTemporaria}
                </code>
                <Button
                  type="button" variant="ghost" size="icon" title="Copiar senha"
                  onClick={() => {
                    if (segredosClinica) {
                      void navigator.clipboard.writeText(segredosClinica.senhaTemporaria);
                      toast.success('Senha copiada.');
                    }
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {segredosClinica?.base32 && (
              <div className="space-y-1">
                <Label className="text-xs">Segundo fator do administrador</Label>
                <SegredoDoisFatores base32={segredosClinica.base32} otpauthUrl={segredosClinica.otpauthUrl} />
              </div>
            )}

            <p className="text-xs text-destructive">
              Nem a senha nem a chave 2FA serão exibidas novamente.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setSegredosClinica(null)}>Concluído</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
