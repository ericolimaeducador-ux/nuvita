import { isAxiosError } from 'axios';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { authApi } from '@/api/resources';
import { Papel } from '@/types';
import { temCoren } from '@/lib/timbre';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Ponto único de emissão dos documentos clínicos. ENFERMEIRO sem COREN não vê (nem imprime) o
 * documento: o conteúdo nem é renderizado enquanto o COREN não existir na conta. Só presença é
 * exigida — o formato do COREN não é validado. Outros papéis (ex.: SECRETARIA) passam direto.
 */
export function GateCorenEmissao({ children }: { children: ReactNode }) {
  const { user, atualizarUsuario } = useAuth();
  const [coren, setCoren] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!user || user.papel !== Papel.ENFERMEIRO || temCoren(user.coren)) return <>{children}</>;

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!user || !temCoren(coren)) return;
    setSalvando(true);
    setErro(null);
    try {
      const res = await authApi.salvarMeuCoren(coren.trim());
      atualizarUsuario({ ...user, ...res.user });
    } catch (e) {
      setErro(
        isAxiosError(e) && e.response?.status === 409
          ? 'Seu COREN já está cadastrado. Saia e entre novamente.'
          : 'Não foi possível salvar o COREN. Tente novamente ou fale com o administrador.',
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-8" role="alert" data-testid="bloqueio-coren">
      <h1 className="text-base font-semibold mb-2">Não é possível emitir o documento</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Preencha seu COREN para emitir documentos. Ele aparece na assinatura de cada documento clínico.
      </p>
      <form onSubmit={salvar} className="space-y-2">
        <Label htmlFor="coren-emissao">Seu COREN</Label>
        <Input id="coren-emissao" placeholder="COREN 00/00000" value={coren} onChange={(e) => setCoren(e.target.value)} />
        <p className="text-xs text-muted-foreground">
          O COREN só pode ser informado uma vez; correções são feitas pelo administrador.
        </p>
        {erro && <p className="text-xs text-red-600">{erro}</p>}
        <Button type="submit" disabled={salvando || !temCoren(coren)}>Salvar COREN</Button>
      </form>
    </div>
  );
}
