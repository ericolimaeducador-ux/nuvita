import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Shield, Plus, Search, KeyRound, Pencil, ChevronLeft, ChevronRight, RefreshCw, RotateCcw, Building2,
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
import type { CreateAdminUserPayload, UpdateUsuarioPayload, ClinicaAdmin } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import {
  Modulo, MODULO_LABEL, TODOS_MODULOS, PERMISSOES_PADRAO_POR_PAPEL,
  resolvePermissoes, Papel, PAPEL_LABEL,
} from '@/types';
import type { UsuarioAdmin } from '@/types';

const PAPEL_BADGE: Record<Papel, string> = {
  [Papel.SUPER_ADMIN]: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  [Papel.ADMIN]: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  [Papel.MEDICO]: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  [Papel.ENFERMEIRO]: 'bg-teal-500/10 text-teal-400 border border-teal-500/20',
  [Papel.ADVOGADO]: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  [Papel.SECRETARIA]: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',
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
});
type CreateForm = z.infer<typeof createSchema>;

const editSchema = z.object({
  nome: z.string().min(1, 'Informe o nome.'),
  papel: z.nativeEnum(Papel, { message: 'Selecione um perfil.' }),
  clinicaId: z.string().optional(),
  ativo: z.boolean(),
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
});
type ClinicaForm = z.infer<typeof clinicaSchema>;

const PLANO_LABEL: Record<ClinicaAdmin['plano'], string> = {
  basico: 'Básico',
  profissional: 'Profissional',
  enterprise: 'Enterprise',
};

// Radix Select não aceita value="" — sentinela para "sem clínica".
const SEM_CLINICA = 'none';

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
    onSuccess: () => {
      toast.success('Usuário criado com sucesso.');
      setCreateOpen(false);
      createForm.reset();
      void invalidate();
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const editMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUsuarioPayload }) =>
      superAdminApi.updateUsuario(id, payload),
    onSuccess: () => {
      toast.success('Usuário atualizado.');
      setEditTarget(null);
      void invalidate();
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

  function openEditClinica(c: ClinicaAdmin) {
    setClinicaTarget(c);
    clinicaForm.reset({ nome: c.nome, plano: c.plano, ativo: c.ativo });
  }

  function openEdit(u: UsuarioAdmin) {
    setEditTarget(u);
    editForm.reset({ nome: u.nome, papel: u.papel, clinicaId: u.clinicaId ?? '', ativo: u.ativo });
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
        <Shield className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
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
                        <Badge variant={u.ativo ? 'default' : 'secondary'} className={u.ativo ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'}>
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
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
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
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm font-mono">{c.cnpj}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{PLANO_LABEL[c.plano]}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{c.totalUsuarios}</TableCell>
                      <TableCell>
                        <Badge variant={c.ativo ? 'default' : 'secondary'} className={c.ativo ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'}>
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
              createMut.mutate({ nome: v.nome, email: v.email, password: v.password, papel: v.papel, clinicaId: v.clinicaId || undefined })
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
                papel: v.papel,
                clinicaId: v.clinicaId || null,
                ativo: v.ativo,
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
            <p className="text-xs text-muted-foreground">
              CNPJ: <span className="font-mono">{clinicaTarget?.cnpj}</span> (não editável)
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
    </div>
  );
}
