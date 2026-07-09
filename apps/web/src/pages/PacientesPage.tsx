import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Plus, Search, Download, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { pacientesApi, type PacienteSort } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { toItems, formatCpf, formatData, idade } from '@/utils';
import { useAuth } from '@/auth/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Sexo, SEXO_LABEL, ProjetoPaciente, PROJETO_LABEL, type Paciente } from '@/types';

const pacienteSchema = z.object({
  nome: z.string().min(1, 'Informe o nome.'),
  cpf: z.string().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF inválido.').optional().or(z.literal('')),
  dataNascimento: z.string().optional(),
  sexo: z.nativeEnum(Sexo, { error: 'Selecione.' }).optional(),
  projeto: z.nativeEnum(ProjetoPaciente, { error: 'Selecione.' }).optional(),
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
type PacienteForm = z.infer<typeof pacienteSchema>;

const SORT_OPTIONS: { value: PacienteSort; label: string }[] = [
  { value: 'recentes', label: 'Mais recentes' },
  { value: 'nome_asc', label: 'Nome (A–Z)' },
  { value: 'nome_desc', label: 'Nome (Z–A)' },
  { value: 'nascimento_asc', label: 'Nascimento (mais velhos)' },
  { value: 'nascimento_desc', label: 'Nascimento (mais novos)' },
];

export function PacientesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [buscaInput, setBuscaInput] = useState('');
  const [busca, setBusca] = useState('');
  const [nascFiltro, setNascFiltro] = useState('');
  const [projetoFiltro, setProjetoFiltro] = useState<ProjetoPaciente | 'all'>('all');
  const [sort, setSort] = useState<PacienteSort>('recentes');
  const [incluirInativos, setIncluirInativos] = useState(false);
  const [open, setOpen] = useState(false);

  // Debounce: evita disparar uma busca (e um audit log) a cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setBusca(buscaInput.trim()), 350);
    return () => clearTimeout(t);
  }, [buscaInput]);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<PacienteForm>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: { consentimento: false },
  });

  // 11 dígitos sem letras = CPF (busca exata); qualquer outra coisa = nome.
  const buscaDigitos = busca.replace(/\D/g, '');
  const buscaEhCpf = buscaDigitos.length === 11 && !/[a-zA-Z]/.test(busca);

  const filtros = {
    nome: !buscaEhCpf && busca ? busca : undefined,
    cpf: buscaEhCpf ? buscaDigitos : undefined,
    dataNascimento: nascFiltro || undefined,
    projeto: projetoFiltro !== 'all' ? projetoFiltro : undefined,
    sort,
    incluirInativos: incluirInativos || undefined,
  };

  const listQ = useInfiniteQuery({
    queryKey: ['pacientes', filtros],
    queryFn: ({ pageParam }) => pacientesApi.list({ ...filtros, cursor: pageParam, limit: 50 }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const temFiltros = Boolean(
    buscaInput || nascFiltro || projetoFiltro !== 'all' || sort !== 'recentes' || incluirInativos,
  );

  function limparFiltros() {
    setBuscaInput('');
    setBusca('');
    setNascFiltro('');
    setProjetoFiltro('all');
    setSort('recentes');
    setIncluirInativos(false);
  }

  const createMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => pacientesApi.create(payload),
    onSuccess: () => {
      toast.success('Paciente cadastrado.');
      setOpen(false);
      reset();
      void qc.invalidateQueries({ queryKey: ['pacientes'] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const pacientes = listQ.data?.pages.flatMap((page) => toItems<Paciente>(page as never)) ?? [];

  function onSubmit(v: PacienteForm) {
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

    createMut.mutate({
      clinicaId: user?.clinicaId,
      nome: v.nome,
      cpf: v.cpf || undefined,
      dataNascimento: v.dataNascimento ? dayjs(v.dataNascimento).format('YYYY-MM-DD') : undefined,
      sexo: v.sexo || undefined,
      projeto: v.projeto || undefined,
      telefone: v.telefone || undefined,
      email: v.email || undefined,
      endereco: temEndereco ? enderecoCampos : undefined,
      consentimentoLGPD: v.consentimento
        ? { aceito: true, dataAceite: new Date().toISOString(), versao: '1.0' }
        : undefined,
    });
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Pacientes"
        subtitle="Cadastro e prontuário base dos pacientes da clínica"
        extra={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo paciente
          </Button>
        }
      />

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="w-full max-w-sm space-y-1">
              <Label htmlFor="buscaPaciente">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="buscaPaciente"
                  className="pl-9"
                  placeholder="Nome ou CPF..."
                  value={buscaInput}
                  onChange={(e) => setBuscaInput(e.target.value)}
                />
              </div>
              {buscaEhCpf && <p className="text-xs text-muted-foreground">Buscando por CPF exato</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="nascFiltro">Data de nascimento</Label>
              <Input
                id="nascFiltro"
                type="date"
                className="w-40"
                value={nascFiltro}
                onChange={(e) => setNascFiltro(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Ordenar por</Label>
              <Select value={sort} onValueChange={(v) => setSort(v as PacienteSort)}>
                <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Projeto</Label>
              <Select value={projetoFiltro} onValueChange={(v) => setProjetoFiltro(v as ProjetoPaciente | 'all')}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os projetos</SelectItem>
                  {Object.values(ProjetoPaciente).map((pj) => (
                    <SelectItem key={pj} value={pj}>{PROJETO_LABEL[pj]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pb-2.5">
              <Checkbox
                id="incluirInativos"
                checked={incluirInativos}
                onCheckedChange={(c) => setIncluirInativos(!!c)}
              />
              <Label htmlFor="incluirInativos" className="cursor-pointer text-sm">Incluir inativos</Label>
            </div>

            {temFiltros && (
              <Button variant="ghost" size="sm" className="mb-1.5" onClick={limparFiltros}>
                <X className="mr-1 h-4 w-4" /> Limpar filtros
              </Button>
            )}
          </div>

          {listQ.isLoading ? (
            <div className="space-y-3">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Nascimento</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="w-14" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pacientes.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/pacientes/${p.id}`)}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell>{formatCpf(p.cpf)}</TableCell>
                    <TableCell>{formatData(p.dataNascimento)}</TableCell>
                    <TableCell>{idade(p.dataNascimento)}</TableCell>
                    <TableCell>{p.sexo ? SEXO_LABEL[p.sexo] : '—'}</TableCell>
                    <TableCell>
                      {p.projeto ? <Badge variant="secondary">{PROJETO_LABEL[p.projeto]}</Badge> : '—'}
                    </TableCell>
                    <TableCell>{p.telefone || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={p.ativo === false ? 'secondary' : 'success'}>
                        {p.ativo === false ? 'Inativo' : 'Ativo'}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost" size="icon" title="Exportar dados (LGPD)"
                        onClick={() =>
                          pacientesApi.export(p.id)
                            .then(() => toast.success('Exportação LGPD gerada.'))
                            .catch((e) => toast.error('Erro', apiErrorMessage(e)))
                        }
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {pacientes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum paciente encontrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {listQ.hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={() => listQ.fetchNextPage()} disabled={listQ.isFetchingNextPage}>
                {listQ.isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo paciente</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">
            Apenas o nome é obrigatório. Os demais dados podem ser completados depois, na tela do paciente.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" placeholder="Maria da Silva" {...register('nome')} />
              {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF (opcional)</Label>
                <Input id="cpf" placeholder="000.000.000-00" {...register('cpf')} />
                {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataNascimento">Nascimento (opcional)</Label>
                <Input id="dataNascimento" type="date" {...register('dataNascimento')} />
                {errors.dataNascimento && <p className="text-sm text-destructive">{errors.dataNascimento.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Sexo (opcional)</Label>
                <Select onValueChange={(v) => setValue('sexo', v as Sexo)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {Object.values(Sexo).map((s) => <SelectItem key={s} value={s}>{SEXO_LABEL[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.sexo && <p className="text-sm text-destructive">{errors.sexo.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Projeto (opcional)</Label>
                <Select onValueChange={(v) => setValue('projeto', v as ProjetoPaciente)}>
                  <SelectTrigger><SelectValue placeholder="Sem projeto" /></SelectTrigger>
                  <SelectContent>
                    {Object.values(ProjetoPaciente).map((pj) => <SelectItem key={pj} value={pj}>{PROJETO_LABEL[pj]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" placeholder="(00) 00000-0000" {...register('telefone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pacEmail">E-mail</Label>
                <Input id="pacEmail" type="email" placeholder="paciente@email.com" {...register('email')} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-3 rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">Endereço (opcional)</p>
              <div className="grid grid-cols-6 gap-3">
                <div className="space-y-2 col-span-4">
                  <Label htmlFor="logradouro">Logradouro</Label>
                  <Input id="logradouro" placeholder="Rua / Avenida" {...register('logradouro')} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input id="numero" placeholder="123" {...register('numero')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input id="complemento" placeholder="Apto, bloco…" {...register('complemento')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input id="bairro" {...register('bairro')} />
                </div>
              </div>
              <div className="grid grid-cols-6 gap-3">
                <div className="space-y-2 col-span-3">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input id="cidade" {...register('cidade')} />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="estado">UF</Label>
                  <Input id="estado" placeholder="SP" maxLength={2} {...register('estado')} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input id="cep" placeholder="00000-000" {...register('cep')} />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="consentimento" checked={watch('consentimento')} onCheckedChange={(c) => setValue('consentimento', !!c)} />
              <Label htmlFor="consentimento" className="text-sm leading-tight cursor-pointer">
                O paciente consente com o tratamento de seus dados (LGPD). Se ainda não foi obtido, deixe em branco e registre depois.
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMut.isPending}>{createMut.isPending ? 'Cadastrando...' : 'Cadastrar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
