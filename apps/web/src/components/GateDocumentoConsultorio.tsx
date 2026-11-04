import { useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/auth/AuthContext';
import { clinicasApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { Papel } from '@/types';
import { useClinicaMinha } from '@/lib/useClinicaMinha';
import { documentoFiscalValido, formatarDocumentoFiscal, TipoDocumentoFiscal } from '@/lib/documento-fiscal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * A psicóloga de um consultório criado sem CPF/CNPJ informa o dado UMA vez, antes de emitir documentos
 * (o documento sai no cabeçalho). Bloqueio só de tela para laudo, encaminhamento, prescrição e prontuário
 * (dívida registrada: o servidor só recusa declaração e atestado, com 422). Outros papéis passam direto.
 */
export function GateDocumentoConsultorio({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const minhaQ = useClinicaMinha();
  const [tipo, setTipo] = useState<TipoDocumentoFiscal>(TipoDocumentoFiscal.CPF);
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const salvarMut = useMutation({
    mutationFn: () => clinicasApi.preencherDocumento({ tipoDocumento: tipo, documento: formatarDocumentoFiscal(tipo, valor) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clinica-minha'] }),
    onError: (e) => {
      setConfirmando(false);
      setErro(apiErrorMessage(e, 'Não foi possível salvar. Tente novamente ou fale com o suporte.'));
    },
  });

  if (!user || user.papel !== Papel.PSICOLOGO) return <>{children}</>;
  if (minhaQ.isLoading) return null;
  // Falha na consulta não trava a emissão pela tela (o servidor continua recusando declaração e atestado sem documento).
  if (minhaQ.isError || minhaQ.data?.documento?.trim()) return <>{children}</>;

  function continuar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!documentoFiscalValido(tipo, valor)) {
      setErro(`${tipo} inválido. Confira os números.`);
      return;
    }
    setConfirmando(true);
  }

  if (confirmando) {
    return (
      <div className="max-w-md mx-auto p-8" role="alert" data-testid="confirma-documento">
        <h1 className="text-base font-semibold mb-2">Confirme o {tipo} do consultório</h1>
        <p className="text-lg font-mono mb-2">{formatarDocumentoFiscal(tipo, valor)}</p>
        <p className="text-sm text-muted-foreground mb-4">
          Este dado será gravado uma única vez e sairá no cabeçalho dos seus documentos. Depois, só o suporte poderá corrigi-lo.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setConfirmando(false)} disabled={salvarMut.isPending}>Voltar</Button>
          <Button type="button" onClick={() => salvarMut.mutate()} disabled={salvarMut.isPending}>Confirmar e salvar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-8" role="alert" data-testid="bloqueio-documento-consultorio">
      <h1 className="text-base font-semibold mb-2">Informe o CPF ou CNPJ do consultório</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Ele aparece no cabeçalho dos documentos clínicos. Você só precisa informar uma vez.
      </p>
      <form onSubmit={continuar} className="space-y-2">
        <div className="flex gap-4 text-sm">
          {[TipoDocumentoFiscal.CPF, TipoDocumentoFiscal.CNPJ].map((t) => (
            <label key={t} className="flex items-center gap-1.5">
              <input type="radio" name="tipo-documento" checked={tipo === t} onChange={() => { setTipo(t); setErro(null); }} />
              {t}
            </label>
          ))}
        </div>
        <Label htmlFor="documento-consultorio">CPF ou CNPJ do consultório</Label>
        <Input
          id="documento-consultorio"
          placeholder={tipo === TipoDocumentoFiscal.CPF ? '000.000.000-00' : '00.000.000/0000-00'}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
        {erro && <p className="text-xs text-red-600">{erro}</p>}
        <Button type="submit" disabled={!valor.trim()}>Continuar</Button>
      </form>
    </div>
  );
}
