import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Info } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { clinicasApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { useAuth } from '@/auth/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Papel, PAPEL_LABEL } from '@/types';

const PAPEIS_CRIAVEIS = [Papel.MEDICO, Papel.ENFERMEIRO, Papel.ADVOGADO, Papel.SECRETARIA];

const usuarioSchema = z.object({
  nome: z.string().min(1, 'Informe o nome.'),
  papel: z.nativeEnum(Papel, { error: 'Selecione o perfil.' }),
  email: z.string().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
  password: z.string().min(10, 'Mínimo de 10 caracteres.'),
});
type UsuarioForm = z.infer<typeof usuarioSchema>;

export function ClinicaPage() {
  const { user } = useAuth();

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<UsuarioForm>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: { papel: Papel.MEDICO },
  });

  const mut = useMutation({
    mutationFn: (payload: { nome: string; email: string; password: string; papel: Papel }) =>
      clinicasApi.criarUsuario(user?.clinicaId ?? '', payload),
    onSuccess: () => { toast.success('Usuário criado com sucesso.'); reset(); },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  function onSubmit(v: UsuarioForm) {
    mut.mutate({ nome: v.nome, email: v.email, password: v.password, papel: v.papel });
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Clínica · Usuários"
        subtitle="Cadastro de profissionais e equipe da sua clínica (multi-tenant)"
      />

      <div className="flex items-start gap-3 glass rounded-xl p-4 mb-6 border-blue-500/20">
        <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">Novo usuário da clínica</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Crie médicos, enfermeiros, advogados ou secretaria. Profissionais (médico, enfermeiro e advogado)
            recebem 2FA obrigatório no primeiro acesso. Disponível apenas para ADMIN.
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input id="nome" placeholder="Dra. Helena Martins" {...register('nome')} />
                {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select defaultValue={Papel.MEDICO} onValueChange={(v) => setValue('papel', v as Papel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAPEIS_CRIAVEIS.map((p) => <SelectItem key={p} value={p}>{PAPEL_LABEL[p]}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.papel && <p className="text-sm text-destructive">{errors.papel.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="clEmail">E-mail</Label>
                <Input id="clEmail" type="email" placeholder="profissional@clinica.com.br" {...register('email')} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha provisória</Label>
                <Input id="password" type="password" placeholder="mínimo 10 caracteres" {...register('password')} />
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>
            </div>

            <Button type="submit" size="lg" disabled={mut.isPending} className="mt-2">
              {mut.isPending ? 'Criando...' : 'Criar usuário'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
