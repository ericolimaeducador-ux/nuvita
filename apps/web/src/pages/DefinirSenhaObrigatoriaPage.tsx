import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/auth/AuthContext';
import { authApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';

// Espelha a política do backend (@MinLength(10) em TrocarSenhaObrigatoriaDto).
const schema = z
  .object({
    novaSenha: z.string().min(10, 'Mínimo de 10 caracteres.'),
    confirmar: z.string(),
  })
  .refine((v) => v.novaSenha === v.confirmar, {
    path: ['confirmar'],
    message: 'As senhas não conferem.',
  });
type Form = z.infer<typeof schema>;

/**
 * Gate de troca de senha obrigatória no 1º login
 * (feature-forced-password-change). A senha atual é temporária (gerada e
 * repassada por fora); aqui o dono define a própria. Ao concluir, o usuário
 * local é atualizado e a GateChain re-avalia.
 */
export function DefinirSenhaObrigatoriaPage() {
  const { atualizarUsuario, logout } = useAuth();
  const [enviando, setEnviando] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Form) {
    setEnviando(true);
    try {
      const { user } = await authApi.trocarSenhaObrigatoria(values.novaSenha);
      atualizarUsuario(user);
      toast.success('Senha definida.');
    } catch (err) {
      toast.error('Não foi possível definir a senha', apiErrorMessage(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 py-8">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-4">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">Defina sua senha</h1>
          <p className="text-sm text-muted-foreground">
            Sua senha atual é temporária. Escolha uma senha própria para continuar.
          </p>
        </header>

        <div className="space-y-1.5">
          <Label htmlFor="novaSenha">Nova senha</Label>
          <PasswordInput id="novaSenha" autoComplete="new-password" {...register('novaSenha')} />
          {errors.novaSenha && (
            <p className="text-xs text-destructive">{errors.novaSenha.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmar">Confirme a nova senha</Label>
          <PasswordInput id="confirmar" autoComplete="new-password" {...register('confirmar')} />
          {errors.confirmar && (
            <p className="text-xs text-destructive">{errors.confirmar.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="text-sm underline text-muted-foreground"
            onClick={() => void logout()}
          >
            Sair
          </button>
          <Button type="submit" disabled={enviando}>
            {enviando ? 'Salvando…' : 'Definir senha'}
          </Button>
        </div>
      </form>
    </div>
  );
}
