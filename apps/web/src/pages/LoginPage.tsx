import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { apiErrorMessage } from '@/api/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';

const loginSchema = z.object({
  email: z.string().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
  password: z.string().min(1, 'Informe a senha.'),
  totpCode: z.string().optional(),
});
type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const estado = location.state as { from?: { pathname: string }; senhaRedefinida?: boolean } | null;
  const from = estado?.from?.pathname ?? '/';
  const senhaRedefinida = estado?.senhaRedefinida === true;

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginForm) {
    setLoading(true);
    try {
      await login(values.email, values.password, values.totpCode || undefined);
      toast.success('Bem-vindo ao Nuvita Psi.');
      navigate(from, { replace: true });
    } catch (err) {
      // O servidor responde igual para senha errada e para código 2FA ausente/errado (sem oráculo de senha).
      toast.error('Erro ao entrar', apiErrorMessage(err, 'Não foi possível entrar.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left — hero */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-bg-dark to-brand-cobalt p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-cobalt/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-accent-gold/10 rounded-full blur-3xl" />

        <div className="relative flex items-center">
          <Logo
            width={230}
            iconColor="#FFB800"
            textColor="#FFFFFF"
            className="drop-shadow-[0_2px_16px_rgba(255,184,0,0.35)]"
          />
        </div>

        <div className="relative">
          <h1 className="text-[2.75rem] font-medium text-white leading-tight mb-4">
            Gestão clínica
            <br />
            <span className="text-accent-gold">que cuida</span> de
            <br />
            quem cuida.
          </h1>
          <p className="text-blue-100/90 text-lg leading-relaxed">
            Prontuário eletrônico, agenda, pacientes e documentos
            em uma plataforma segura, multi-tenant e em
            conformidade com a LGPD.
          </p>
        </div>

        <p className="relative text-blue-300/70 text-sm">
          © {new Date().getFullYear()} Nuvita Psi · Plataforma para psicólogos
        </p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo (fundo claro) */}
          <div className="flex items-center mb-8 lg:hidden">
            <Logo width={160} iconColor="#E6A600" textColor="#1F2937" />
          </div>

          <div className="glass rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-foreground mb-1">Acessar painel</h2>
            <p className="text-muted-foreground text-sm mb-6">Entre com seu e-mail e senha.</p>
            {senhaRedefinida && (
              <p role="status" className="mb-4 rounded-md border border-border bg-secondary p-3 text-sm">
                Senha alterada. Entre com a nova senha.
              </p>
            )}

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

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <PasswordInput
                    id="password"
                    className="pl-9"
                    placeholder="••••••••••"
                    autoComplete="current-password"
                    {...register('password')}
                  />
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>

              <div className="space-y-2">
                  <Label htmlFor="totpCode">Código de verificação (2FA), se sua conta usa</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="totpCode"
                      className="pl-9"
                      placeholder="000000"
                      maxLength={6}
                      inputMode="numeric"
                      {...register('totpCode')}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Deixe em branco se você não usa autenticador.</p>
                </div>

              <Button type="submit" className="w-full h-11 text-base mt-2" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <div className="mt-5 space-y-2 text-sm">
              <Link to="/esqueci-senha" className="underline">Esqueci minha senha</Link>
              <p className="text-xs text-muted-foreground">
                Perdeu o acesso ao código de verificação (2FA)? Ele não é recuperado automaticamente: escreva para{' '}
                <a className="underline" href="mailto:contato@nuvita.app.br">contato@nuvita.app.br</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
