import { useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { authApi } from '@/api/resources';
import { Papel } from '@/types';
import { temCrp } from '@/lib/timbre';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Ponto único de emissão dos documentos clínicos. PSICOLOGO sem CRP não vê (nem imprime) o
 * documento: o conteúdo nem é renderizado enquanto o CRP não existir na conta. Só presença é
 * exigida — o formato do CRP não é validado. Outros papéis (ex.: SECRETARIA) passam direto.
 */
export function GateCrpEmissao({ children }: { children: ReactNode }) {
  const { user, atualizarUsuario } = useAuth();
  const [crp, setCrp] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!user || user.papel !== Papel.PSICOLOGO || temCrp(user.crp)) return <>{children}</>;

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!user || !temCrp(crp)) return;
    setSalvando(true);
    setErro(null);
    try {
      const res = await authApi.salvarMeuCrp(crp.trim());
      atualizarUsuario({ ...user, ...res.user });
    } catch {
      setErro('Não foi possível salvar o CRP. Tente novamente ou fale com o administrador.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-8" role="alert" data-testid="bloqueio-crp">
      <h1 className="text-base font-semibold mb-2">Não é possível emitir o documento</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Documentos clínicos levam o seu CRP na assinatura. Preencha seu CRP no perfil para continuar.
      </p>
      <form onSubmit={salvar} className="space-y-2">
        <Label htmlFor="crp-emissao">Seu CRP</Label>
        <Input id="crp-emissao" placeholder="CRP 00/00000" value={crp} onChange={(e) => setCrp(e.target.value)} />
        <p className="text-xs text-muted-foreground">
          O CRP só pode ser informado uma vez; correções são feitas pelo administrador.
        </p>
        {erro && <p className="text-xs text-red-600">{erro}</p>}
        <Button type="submit" disabled={salvando || !temCrp(crp)}>Salvar CRP</Button>
      </form>
    </div>
  );
}
