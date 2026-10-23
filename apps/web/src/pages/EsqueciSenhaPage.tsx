import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail } from 'lucide-react';
import { authApi } from '@/api/resources';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';

const CONFIRMACAO =
  'Se este e-mail estiver cadastrado, enviamos um link para redefinir a senha. Ele vale por 45 minutos. Confira também a caixa de spam.';

/**
 * "Esqueci minha senha". A confirmação é SEMPRE a mesma (deu certo, e-mail inexistente ou erro do
 * servidor): a tela não pode revelar se o e-mail está cadastrado. Perda do 2FA não se resolve aqui.
 */
export function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setEnviando(true);
    try {
      await authApi.esqueciSenha(email.trim());
    } catch {
      // Mesma resposta de qualquer jeito.
    } finally {
      setEnviando(false);
      setEnviado(true);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 py-8">
      <div className="w-full max-w-md glass rounded-2xl p-8 shadow-2xl space-y-5">
        <Logo width={160} iconColor="#E6A600" textColor="#1F2937" />
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">Esqueci minha senha</h1>
          <p className="text-sm text-muted-foreground">
            Informe o e-mail da sua conta. Enviaremos um link para você definir uma nova senha.
          </p>
        </header>

        {enviado ? (
          <p role="status" className="rounded-md border border-border bg-secondary p-3 text-sm">
            {CONFIRMACAO}
          </p>
        ) : (
          <form onSubmit={enviar} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email" type="email" className="pl-9" autoComplete="username"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-11" disabled={enviando}>
              {enviando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : 'Enviar link'}
            </Button>
          </form>
        )}

        <p className="text-xs text-muted-foreground">
          Perdeu o acesso ao código de verificação (2FA)? Ele não é recuperado por aqui: escreva para{' '}
          <a className="underline" href="mailto:contato@nuvita.app.br">contato@nuvita.app.br</a>.
        </p>
        <Link to="/login" className="text-sm underline">Voltar ao login</Link>
      </div>
    </div>
  );
}
