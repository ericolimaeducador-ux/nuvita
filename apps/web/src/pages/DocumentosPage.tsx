import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Download, Trash2, File } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { documentosApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { toItems } from '@/utils';
import { toast } from '@/components/ui/use-toast';
import { TIPO_DOCUMENTO_LABEL, type Documento } from '@/types';

function fmtTamanho(bytes?: number): string {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentosPage() {
  const qc = useQueryClient();

  const listQ = useQuery({ queryKey: ['documentos'], queryFn: () => documentosApi.list() });

  const excluirMut = useMutation({
    mutationFn: (id: string) => documentosApi.excluir(id),
    onSuccess: () => { toast.success('Documento excluído.'); void qc.invalidateQueries({ queryKey: ['documentos'] }); },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  async function baixar(id: string) {
    try {
      const { accessUrl } = await documentosApi.accessUrl(id);
      if (accessUrl) window.open(accessUrl, '_blank');
      else toast.info('URL de acesso indisponível.');
    } catch (e) {
      toast.error('Erro', apiErrorMessage(e));
    }
  }

  const docs = toItems<Documento>(listQ.data as never);

  return (
    <div className="p-6">
      <PageHeader
        title="Documentos"
        subtitle="Arquivos clínicos e administrativos de todos os pacientes (só leitura — o envio é feito na página de cada paciente)"
      />

      <Card>
        <CardContent className="p-6">
          {listQ.isLoading ? (
            <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Enviado em</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-blue-400 shrink-0" />
                        <span className="font-medium">{d.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>{d.tipo ? <Badge variant="secondary">{TIPO_DOCUMENTO_LABEL[d.tipo]}</Badge> : '—'}</TableCell>
                    <TableCell>{fmtTamanho(d.tamanho)}</TableCell>
                    <TableCell>{d.criadoEm ? dayjs(d.criadoEm).format('DD/MM/YYYY') : '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" title="Baixar" onClick={() => baixar(d.id)}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" title="Excluir"
                          className="text-destructive hover:text-destructive"
                          onClick={() => excluirMut.mutate(d.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {docs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum documento encontrado</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
