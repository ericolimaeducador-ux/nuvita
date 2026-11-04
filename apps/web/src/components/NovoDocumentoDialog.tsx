import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { documentosApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/auth/AuthContext';
import { sha256Hex } from '@/lib/sha256';
import { TipoDocumento, TIPO_DOCUMENTO_LABEL } from '@/types';


// Deve espelhar MAX_DOCUMENT_SIZE_BYTES no backend (economia de armazenamento no R2).
const MAX_TAMANHO_MB = 10;
const MAX_TAMANHO_BYTES = MAX_TAMANHO_MB * 1024 * 1024;

export function NovoDocumentoDialog({
  pacienteId,
  pacienteNome,
  open,
  onOpenChange,
}: {
  pacienteId: string;
  pacienteNome?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoDocumento>(TipoDocumento.OUTRO);
  const [file, setFile] = useState<File | null>(null);
  const [etapa, setEtapa] = useState<'idle' | 'hash' | 'upload' | 'confirmando'>('idle');

  function reset() {
    setNome(''); setTipo(TipoDocumento.OUTRO); setFile(null); setEtapa('idle');
  }

  const mut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Selecione um arquivo.');
      if (!nome.trim()) throw new Error('Informe o nome do documento.');
      if (!user?.clinicaId) throw new Error('Sessão sem clínica associada.');
      if (file.size > MAX_TAMANHO_BYTES) {
        throw new Error(`Arquivo maior que ${MAX_TAMANHO_MB}MB. Reduza o tamanho antes de enviar.`);
      }

      setEtapa('hash');
      const hash = await sha256Hex(file);

      const presign = await documentosApi.presignUpload({
        clinicaId: user.clinicaId,
        pacienteId,
        nome: nome.trim(),
        nomePaciente: pacienteNome,
        tipo,
        mimeType: file.type,
        tamanho: file.size,
        hash,
      });

      setEtapa('upload');
      // fetch() puro — NÃO usar a instância `api` (axios), que anexa
      // Authorization/cookies em toda chamada e quebraria a assinatura da
      // URL presignada (outra origem, S3/R2).
      const putResp = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: presign.requiredHeaders,
        body: file,
      });
      if (!putResp.ok) throw new Error('Falha ao enviar o arquivo para o armazenamento.');

      setEtapa('confirmando');
      return documentosApi.confirmarUpload(presign.documento.id);
    },
    onSuccess: () => {
      toast.success('Documento enviado.');
      onOpenChange(false);
      reset();
      void qc.invalidateQueries({ queryKey: ['documentos'] });
    },
    onError: (e) => { toast.error('Erro', apiErrorMessage(e)); setEtapa('idle'); },
  });

  const textoBotao =
    etapa === 'hash' ? 'Calculando…'
    : etapa === 'upload' ? 'Enviando…'
    : etapa === 'confirmando' ? 'Confirmando…'
    : 'Enviar documento';

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo documento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do documento</Label>
            <Input placeholder="Digite o título do documento" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoDocumento)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.values(TipoDocumento).map((t) => <SelectItem key={t} value={t}>{TIPO_DOCUMENTO_LABEL[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Arquivo (PDF, JPEG, PNG ou DICOM — máx. {MAX_TAMANHO_MB}MB)</Label>
            <Input
              type="file"
              accept="application/pdf,image/jpeg,image/png,application/dicom"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => mut.mutate()} disabled={!file || !nome.trim() || mut.isPending}>
            <Upload className="mr-2 h-4 w-4" /> {textoBotao}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
