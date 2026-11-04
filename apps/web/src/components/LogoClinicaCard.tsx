import { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { ImagePlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { clinicasApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { sha256Hex } from '@/lib/sha256';
import { LOGO_TIPOS_ACEITOS, validarArquivoLogo } from '@/lib/logoClinica';

interface Props {
  clinicaId: string;
  /** GET presignado de /clinicas/minha (ADMIN). Ausente = clínica sem logo. */
  logoUrl?: string;
  /** SUPER_ADMIN: a logo vigente da clínica escolhida não é consultável aqui (só ADMIN lê /clinicas/minha). */
  logoAtualDesconhecida?: boolean;
  /** Chamado depois de salvar/remover (o ADMIN rebusca /clinicas/minha para atualizar o preview). */
  onAlterada?: () => void | Promise<void>;
}

class FalhaArmazenamento extends Error {}

function mensagemDeErro(e: unknown): string {
  if (e instanceof FalhaArmazenamento || (e instanceof TypeError && !isAxiosError(e))) {
    return 'Não foi possível enviar a logo para o armazenamento. Tente novamente.';
  }
  if (isAxiosError(e)) {
    const status = e.response?.status;
    if (status === 422 || status === 400) return apiErrorMessage(e, 'A logo não foi aceita. Use PNG ou JPG de até 2 MB.');
    if (status === 403) return 'Você não tem permissão para alterar a logo desta clínica.';
    if (!e.response) return 'Sem conexão com o servidor. Verifique a internet e tente novamente.';
  }
  return 'Não foi possível salvar a logo. Tente novamente.';
}

/**
 * Logo da clínica: preview, adicionar/trocar (PNG/JPG até 2 MB) e remover. Fluxo do upload: SHA-256 do
 * arquivo → upload-url → PUT presignado no R2 (Content-Type + x-amz-meta-sha256) → confirmar → rebuscar.
 * A validação aqui é conveniência; o servidor é o gate (422). A logo é cosmética: a identidade fiscal
 * (documento/razão social) não é editável por esta tela.
 */
export function LogoClinicaCard({ clinicaId, logoUrl, logoAtualDesconhecida, onAlterada }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selecionado, setSelecionado] = useState<{ file: File; preview: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<null | 'enviando' | 'removendo'>(null);

  useEffect(() => () => { if (selecionado) URL.revokeObjectURL(selecionado.preview); }, [selecionado]);

  function escolher(file?: File) {
    setStatus(null);
    if (!file) return;
    const problema = validarArquivoLogo(file);
    if (problema) {
      setSelecionado(null);
      setErro(problema);
      return;
    }
    setErro(null);
    setSelecionado({ file, preview: URL.createObjectURL(file) });
  }

  async function salvar() {
    if (!selecionado) return;
    const { file } = selecionado;
    setOcupado('enviando');
    setErro(null);
    setStatus(null);
    try {
      const hash = await sha256Hex(file);
      const presign = await clinicasApi.solicitarUploadLogo(clinicaId, { mimeType: file.type, tamanho: file.size, hash });
      // fetch() puro — NÃO usar a instância `api` (axios): ela anexa Authorization/cookies e quebraria a
      // assinatura da URL presignada (outra origem, R2). Os headers precisam ser os assinados.
      const put = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type, 'x-amz-meta-sha256': hash },
        body: file,
      });
      if (!put.ok) throw new FalhaArmazenamento();
      await clinicasApi.confirmarLogo(clinicaId, presign.logoKey);
      await onAlterada?.();
      setSelecionado(null);
      setStatus('Logo atualizada.');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(null);
    }
  }

  async function remover() {
    setOcupado('removendo');
    setErro(null);
    setStatus(null);
    try {
      await clinicasApi.removerLogo(clinicaId);
      await onAlterada?.();
      setSelecionado(null);
      setStatus('Logo removida.');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setOcupado(null);
    }
  }

  const temLogo = !!logoUrl;

  return (
    <Card className="max-w-2xl mb-6">
      <CardContent className="p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold">Logo da clínica</h2>
          <p className="text-sm text-muted-foreground">
            Aparece no cabeçalho dos documentos clínicos. PNG ou JPG, até 2 MB.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {selecionado ? (
            <img
              src={selecionado.preview}
              alt="Logo selecionada (ainda não salva)"
              data-testid="logo-preview-selecionado"
              className="max-h-20 max-w-48 object-contain rounded border border-border p-1"
            />
          ) : temLogo ? (
            <img
              src={logoUrl}
              alt="Logo atual da clínica"
              data-testid="logo-atual"
              className="max-h-20 max-w-48 object-contain rounded border border-border p-1"
            />
          ) : logoAtualDesconhecida ? (
            <p data-testid="logo-desconhecida" className="text-sm text-muted-foreground">
              A logo vigente aparece no cabeçalho dos documentos desta clínica.
            </p>
          ) : (
            <div data-testid="logo-vazio" className="flex items-center gap-3 text-sm text-muted-foreground">
              <ImagePlus className="h-8 w-8 shrink-0" />
              <p>
                Esta clínica ainda não tem logo. Enquanto isso, os documentos usam o nome da clínica em texto no
                cabeçalho.
              </p>
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={LOGO_TIPOS_ACEITOS.join(',')}
          data-testid="logo-input"
          className="hidden"
          onChange={(e) => {
            escolher(e.target.files?.[0]);
            e.target.value = ''; // permite escolher o mesmo arquivo de novo
          }}
        />

        {erro && (
          <p role="alert" data-testid="logo-erro" className="text-sm text-destructive">
            {erro}
          </p>
        )}
        {status && (
          <p role="status" data-testid="logo-status" className="text-sm text-emerald-700">
            {status}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {selecionado ? (
            <>
              <Button type="button" onClick={() => void salvar()} disabled={!!ocupado}>
                {ocupado === 'enviando' ? 'Enviando…' : 'Salvar logo'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => { setSelecionado(null); setErro(null); }} disabled={!!ocupado}>
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant={temLogo ? 'outline' : 'default'} onClick={() => inputRef.current?.click()} disabled={!!ocupado}>
                {temLogo || logoAtualDesconhecida ? 'Trocar logo' : 'Adicionar logo'}
              </Button>
              {(temLogo || logoAtualDesconhecida) && (
                <Button type="button" variant="ghost" onClick={() => void remover()} disabled={!!ocupado}>
                  {ocupado === 'removendo' ? 'Removendo…' : 'Remover logo'}
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
