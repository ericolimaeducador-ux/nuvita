import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { authApi } from '@/api/resources';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';

const schema = z.object({
  email: z.string().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
});
type Form = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: Form) {
    setLoading(true);
    try {
      // A resposta é sempre genérica (não revela se o e-mail existe), então
      // não há tratamento de erro específico a mostrar aqui.
      await authApi.forgotPassword(values.email);
    } finally {
      setLoading(false);
      setEnviado(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <Logo width={160} iconColor="#E6A600" textColor="#1F2937" />
        </div>

        <div className="glass rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-foreground mb-1">Esqueci minha senha</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Informe o e-mail cadastrado. Se ele existir em nossa base, enviaremos um link para redefinir a senha.
          </p>

          {enviado ? (
            <p className="text-sm text-foreground bg-secondary/50 rounded-lg p-4">
              Se o e-mail existir em nossa base, você receberá um link de redefinição em instantes. Confira também a
              caixa de spam.
            </p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-9"
                    placeholder="voce@clinica.com.br"
                    autoComplete="username"
                    {...register('email')}
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <Button type="submit" className="w-full h-11 text-base mt-2" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                ) : (
                  'Enviar link de redefinição'
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
