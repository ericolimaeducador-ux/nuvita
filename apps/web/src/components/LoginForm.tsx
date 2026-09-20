import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'react-router-dom';
import { Mail, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth, BOAS_VINDAS_KEY } from '@/auth/AuthContext';
import { apiErrorMessage } from '@/api/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';

const loginSchema = z.object({
  email: z.string().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
  password: z.string().min(1, 'Informe a senha.'),
  totpCode: z.string().optional(),
});
type LoginValues = z.infer<typeof loginSchema>;

// Cartão de login reutilizável (/login e seção final da landing page).
export function LoginForm() {
  const { login } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [needs2fa, setNeeds2fa] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginValues) {
    setLoading(true);
    let redirecionando = false;
    try {
      await login(values.email, values.password, values.totpCode || undefined);
      // Navegação de página COMPLETA (não o router): descarta todo script/timer
      // da página pública (ex.: heartbeat do gtag.js agendado na landing), para
      // que nada dela sobreviva dentro do app logado. O toast é adiado para a
      // próxima carga porque o reload apagaria o estado React.
      try { sessionStorage.setItem(BOAS_VINDAS_KEY, '1'); } catch { /* sem storage: só perde o toast */ }
      const base = import.meta.env.BASE_URL.replace(/\/$/, '');
      window.location.assign(`${base}${from === '/' ? '/dashboard' : from}`);
      redirecionando = true; // mantém o botão em "Entrando..." até a página recarregar
    } catch (err) {
      const msg = apiErrorMessage(err, 'Não foi possível entrar.');
      if (/2fa|totp|c[óo]digo|two.?factor/i.test(msg)) {
        setNeeds2fa(true);
        toast.info('Informe o código de verificação (2FA).');
      } else {
        toast.error('Erro ao entrar', msg);
      }
    } finally {
      if (!redirecionando) setLoading(false);
    }
  }

  return (
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
  );
}
