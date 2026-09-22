import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, ShieldCheck, Loader2, ArrowLeft } from 'lucide-react';
import { authApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';

const telefoneSchema = z.object({
  telefone: z.string().min(8, 'Informe um telefone válido.'),
});
type TelefoneForm = z.infer<typeof telefoneSchema>;

const codigoSchema = z.object({
  codigo: z.string().length(6, 'O código tem 6 dígitos.'),
});
type CodigoForm = z.infer<typeof codigoSchema>;

export function ForgotLoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [telefone, setTelefone] = useState('');
  const [emailMascarado, setEmailMascarado] = useState<string | null>(null);

  const telefoneForm = useForm<TelefoneForm>({ resolver: zodResolver(telefoneSchema) });
  const codigoForm = useForm<CodigoForm>({ resolver: zodResolver(codigoSchema) });

  async function onSubmitTelefone(values: TelefoneForm) {
    setLoading(true);
    try {
      // Resposta sempre genérica — não revela se o telefone está cadastrado.
      await authApi.forgotLogin(values.telefone);
      setTelefone(values.telefone);
      setEnviado(true);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitCodigo(values: CodigoForm) {
    setLoading(true);
    try {
      const result = await authApi.verifyForgotLogin(telefone, values.codigo);
      setEmailMascarado(result.emailMascarado);
      toast.success('Código verificado. Redirecionando para trocar a senha...');
      navigate(`/redefinir-senha?token=${result.resetToken}`, { replace: true });
    } catch (err) {
      toast.error('Não foi possível verificar', apiErrorMessage(err, 'Código inválido ou expirado.'));
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
          <h2 className="text-2xl font-bold text-foreground mb-1">Esqueci meu login</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Informe o telefone cadastrado. Enviaremos um código por WhatsApp para confirmar sua identidade.
          </p>

          {!enviado ? (
            <form onSubmit={telefoneForm.handleSubmit(onSubmitTelefone)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone (com DDD)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="telefone"
                    className="pl-9"
                    placeholder="(11) 91234-5678"
                    autoComplete="tel"
                    {...telefoneForm.register('telefone')}
                  />
                </div>
                {telefoneForm.formState.errors.telefone && (
                  <p className="text-sm text-destructive">{telefoneForm.formState.errors.telefone.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full h-11 text-base mt-2" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</>
                ) : (
                  'Enviar código por WhatsApp'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={codigoForm.handleSubmit(onSubmitCodigo)} className="space-y-4">
              <p className="text-sm text-foreground bg-secondary/50 rounded-lg p-4">
                Se o telefone existir em nossa base, você recebeu um código de 6 dígitos por WhatsApp. Ele expira em
                10 minutos.
              </p>

              <div className="space-y-2">
                <Label htmlFor="codigo">Código de verificação</Label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="codigo"
                    className="pl-9 tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    {...codigoForm.register('codigo')}
                  />
                </div>
                {codigoForm.formState.errors.codigo && (
                  <p className="text-sm text-destructive">{codigoForm.formState.errors.codigo.message}</p>
                )}
              </div>

              {emailMascarado && (
                <p className="text-sm text-muted-foreground">
                  E-mail de login: <span className="font-medium text-foreground">{emailMascarado}</span>
                </p>
              )}

              <Button type="submit" className="w-full h-11 text-base mt-2" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>
                ) : (
                  'Verificar código'
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
