import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { Plus, Search, Download } from 'lucide-react';
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
import { pacientesApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { toItems, formatCpf, idade } from '@/utils';
import { useAuth } from '@/auth/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Sexo, SEXO_LABEL, type Paciente } from '@/types';

const pacienteSchema = z.object({
  nome: z.string().min(1, 'Informe o nome.'),
  cpf: z.string().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF inválido.'),
  dataNascimento: z.string().min(1, 'Informe a data.'),
  sexo: z.nativeEnum(Sexo, { error: 'Selecione.' }),
  telefone: z.string().optional(),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
  consentimento: z.boolean().refine((v) => v, 'Consentimento obrigatório (LGPD).'),
});
type PacienteForm = z.infer<typeof pacienteSchema>;

export function PacientesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [busca, setBusca] = useState('');
  const [open, setOpen] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<PacienteForm>({
    resolver: zodResolver(pacienteSchema),
    defaultValues: { consentimento: false },
  });

  const listQ = useQuery({
    queryKey: ['pacientes', busca],
    queryFn: () => pacientesApi.list({ nome: busca || undefined, limit: 50 }),
  });

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

  const pacientes = toItems<Paciente>(listQ.data as never);

  function onSubmit(v: PacienteForm) {
    createMut.mutate({
      clinicaId: user?.clinicaId,
      nome: v.nome,
      cpf: v.cpf,
      dataNascimento: dayjs(v.dataNascimento).format('YYYY-MM-DD'),
      sexo: v.sexo,
      telefone: v.telefone || undefined,
      email: v.email || undefined,
      consentimentoLGPD: { aceito: true, dataAceite: new Date().toISOString(), versao: '1.0' },
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
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome..." onChange={(e) => setBusca(e.target.value)} />
          </div>

          {listQ.isLoading ? (
            <div className="space-y-3">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Sexo</TableHead>
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
                    <TableCell>{idade(p.dataNascimento)}</TableCell>
                    <TableCell>{p.sexo ? SEXO_LABEL[p.sexo] : '—'}</TableCell>
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
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum paciente encontrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo paciente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" placeholder="Maria da Silva" {...register('nome')} />
              {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" placeholder="000.000.000-00" {...register('cpf')} />
                {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataNascimento">Nascimento</Label>
                <Input id="dataNascimento" type="date" {...register('dataNascimento')} />
                {errors.dataNascimento && <p className="text-sm text-destructive">{errors.dataNascimento.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Sexo</Label>
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
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" placeholder="(00) 00000-0000" {...register('telefone')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pacEmail">E-mail</Label>
                <Input id="pacEmail" type="email" placeholder="paciente@email.com" {...register('email')} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="consentimento" checked={watch('consentimento')} onCheckedChange={(c) => setValue('consentimento', !!c)} />
              <Label htmlFor="consentimento" className="text-sm leading-tight cursor-pointer">
                O paciente consente com o tratamento de seus dados (LGPD).
              </Label>
            </div>
            {errors.consentimento && <p className="text-sm text-destructive">{errors.consentimento.message}</p>}

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
