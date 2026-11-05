import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/api/resources';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';

// Espelha a política do backend (@MinLength(10) em RedefinirSenhaDto).
const schema = z
  .object({ novaSenha: z.string().min(10, 'Mínimo de 10 caracteres.'), confirmar: z.string() })
  .refine((v) => v.novaSenha === v.confirmar, { path: ['confirmar'], message: 'As senhas não conferem.' });
type Form = z.infer<typeof schema>;

/** Destino do link do e-mail: a pessoa define a senha DEFINITIVA aqui (o 2FA não é tocado). */
export function RedefinirSenhaPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [invalido, setInvalido] = useState(!token);
  const [enviando, setEnviando] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(v: Form) {
    setEnviando(true);
    try {
      await authApi.redefinirSenha(token, v.novaSenha);
      navigate('/login', { replace: true, state: { senhaRedefinida: true } });
    } catch {
      setInvalido(true);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 py-8">
      <div className="w-full max-w-md glass rounded-2xl p-8 shadow-2xl space-y-5">
        <Logo width={160} iconColor="#E6A600" textColor="#1F2937" />
        <h1 className="text-xl font-semibold">Definir nova senha</h1>

        {invalido ? (
          <div className="space-y-3 text-sm">
            <p className="rounded-md border border-destructive/40 p-3 text-destructive">Link inválido ou expirado.</p>
            <Link to="/esqueci-senha" className="underline">Pedir um novo link</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="novaSenha">Nova senha</Label>
              <PasswordInput id="novaSenha" autoComplete="new-password" {...register('novaSenha')} />
              {errors.novaSenha && <p className="text-xs text-destructive">{errors.novaSenha.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmar">Confirme a nova senha</Label>
              <PasswordInput id="confirmar" autoComplete="new-password" {...register('confirmar')} />
              {errors.confirmar && <p className="text-xs text-destructive">{errors.confirmar.message}</p>}
            </div>
            <Button type="submit" className="w-full h-11" disabled={enviando}>
              {enviando ? 'Salvando…' : 'Redefinir senha'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
