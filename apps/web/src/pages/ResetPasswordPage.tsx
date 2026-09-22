import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Loader2, ArrowLeft } from 'lucide-react';
import { authApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';

const schema = z
  .object({
    novaSenha: z.string().min(10, 'A senha precisa ter no mínimo 10 caracteres.'),
    confirmarSenha: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((v) => v.novaSenha === v.confirmarSenha, {
    message: 'As senhas não coincidem.',
    path: ['confirmarSenha'],
  });
type Form = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: Form) {
    setLoading(true);
    try {
      await authApi.resetPassword(token, values.novaSenha);
      toast.success('Senha redefinida com sucesso.');
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error('Não foi possível redefinir a senha', apiErrorMessage(err, 'Link inválido ou expirado.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Logo width={160} iconColor="#E6A600" textColor="#1F2937" />
        </div>

        <div className="glass rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-foreground mb-1">Definir nova senha</h2>
          <p className="text-muted-foreground text-sm mb-6">Escolha uma nova senha para acessar sua conta.</p>

          {!token ? (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-4">
              Link inválido. Solicite um novo link em "Esqueci minha senha".
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="novaSenha">Nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <PasswordInput
                    id="novaSenha"
                    className="pl-9"
                    placeholder="••••••••••"
                    autoComplete="new-password"
                    {...register('novaSenha')}
                  />
                </div>
                {errors.novaSenha && <p className="text-sm text-destructive">{errors.novaSenha.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Confirmar nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <PasswordInput
                    id="confirmarSenha"
                    className="pl-9"
                    placeholder="••••••••••"
                    autoComplete="new-password"
                    {...register('confirmarSenha')}
                  />
                </div>
                {errors.confirmarSenha && <p className="text-sm text-destructive">{errors.confirmarSenha.message}</p>}
              </div>

              <Button type="submit" className="w-full h-11 text-base mt-2" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                ) : (
                  'Salvar nova senha'
                )}
              </Button>
            </form>
          )}

          <Link
            to="/login"
            className="mt-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}
