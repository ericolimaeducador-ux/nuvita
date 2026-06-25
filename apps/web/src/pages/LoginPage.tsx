import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/auth/AuthContext';
import { apiErrorMessage } from '@/api/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { brand } from '@/lib/brand';

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
  const [needs2fa, setNeeds2fa] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginForm) {
    setLoading(true);
    try {
      await login(values.email, values.password, values.totpCode || undefined);
      toast.success('Bem-vindo ao Nuvita.');
      navigate(from, { replace: true });
    } catch (err) {
      const msg = apiErrorMessage(err, 'Não foi possível entrar.');
      if (/2fa|totp|c[óo]digo|two.?factor/i.test(msg)) {
        setNeeds2fa(true);
        toast.info('Informe o código de verificação (2FA).');
      } else {
        toast.error('Erro ao entrar', msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left — hero */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-emerald-900 p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl" />

        <div className="relative flex items-center">
          <img src={brand.logo.light} alt={`${brand.nome} — ${brand.slogan}`} className="h-12 w-auto" />
        </div>

        <div className="relative">
          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            Gestão clínica
            <br />
            <span className="text-emerald-400">que cuida</span> de
            <br />
            quem cuida.
          </h1>
          <p className="text-blue-200 text-lg leading-relaxed">
            Prontuário eletrônico, agenda, pacientes e documentos
            em uma plataforma segura, multi-tenant e em
            conformidade com a LGPD.
          </p>
        </div>

        <p className="relative text-blue-300/70 text-sm">
          © {new Date().getFullYear()} Nuvita · Plataforma de saúde
        </p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center mb-8 lg:hidden">
            <img src={brand.logo.light} alt={brand.nome} className="h-9 w-auto" />
          </div>

          <div className="glass rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-foreground mb-1">Acessar painel</h2>
            <p className="text-muted-foreground text-sm mb-6">Entre com suas credenciais corporativas.</p>

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
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-9"
                    placeholder="••••••••••"
                    autoComplete="current-password"
                    {...register('password')}
                  />
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>

              {needs2fa && (
                <div className="space-y-2">
                  <Label htmlFor="totpCode">Código de verificação (2FA)</Label>
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
                </div>
              )}

              <Button type="submit" className="w-full h-11 text-base mt-2" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
