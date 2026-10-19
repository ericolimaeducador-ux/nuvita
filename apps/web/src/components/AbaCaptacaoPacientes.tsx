import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { RefreshCw } from 'lucide-react';
import { captacaoApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { formatCpf } from '@/utils';

export function AbaCaptacaoPacientes() {
  const qc = useQueryClient();
  const lista = useQuery({
    queryKey: ['captacao', 'pendentes'],
    queryFn: () => captacaoApi.listarPendentes(),
  });

  const exportar = useMutation({
    mutationFn: (id: string) => captacaoApi.exportar(id),
    onSuccess: () => {
      toast.success('Paciente cadastrado no prontuário.', 'Ele já aparece na lista de pacientes desta clínica.');
      void qc.invalidateQueries({ queryKey: ['captacao', 'pendentes'] });
      void qc.invalidateQueries({ queryKey: ['pacientes'] });
    },
    onError: (error) => toast.error('Falha ao exportar', apiErrorMessage(error)),
  });

  function handleExportar(id: string, nome: string) {
    const ok = window.confirm(
      `Confirmar exportação do paciente "${nome}" para o cadastro de pacientes desta clínica?`,
    );
    if (!ok) return;
    exportar.mutate(id);
  }

  const pacientes = lista.data?.data ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="Captação de Pacientes"
        description="Fila enviada pelo posto do enfermeiro. O código só é criado em /captacao_pacientes. Daqui a clínica exporta para o cadastro."
        extra={
          <Button variant="outline" onClick={() => void lista.refetch()} disabled={lista.isFetching}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar lista
          </Button>
        }
      />

      <div className="min-h-0 flex-1">
        <Card className="h-full min-w-0 overflow-hidden">
          <CardContent className="h-full overflow-auto pt-6">
            {lista.isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando captações pendentes...</p>
            ) : lista.isError ? (
              <p className="text-sm text-destructive">{apiErrorMessage(lista.error, 'Não foi possível carregar a lista.')}</p>
            ) : pacientes.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma captação pendente. O próximo cadastro aparece aqui.
              </p>
            ) : (
              <Table className="table-fixed [&_td]:px-2 [&_th]:px-2">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[96px]">Código</TableHead>
                    <TableHead>Paciente</TableHead>
                    <TableHead className="w-[132px]">CPF</TableHead>
                    <TableHead className="w-[148px]">Contato</TableHead>
                    <TableHead className="w-[92px]">Captação</TableHead>
                    <TableHead className="w-[104px] text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pacientes.map((p) => {
                    const processando = exportar.isPending && exportar.variables === p.id;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="whitespace-nowrap font-semibold text-brand-cobalt">{p.codigoEnfermeiro}</TableCell>
                        <TableCell className="truncate font-medium" title={p.nome}>{p.nome}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatCpf(p.cpf)}</TableCell>
                        <TableCell>
                          <div className="whitespace-nowrap">{p.telefone}</div>
                          <div className="truncate text-xs text-muted-foreground" title={p.email}>{p.email}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {dayjs(p.criadoEm).format('DD/MM/YYYY')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            disabled={exportar.isPending}
                            onClick={() => handleExportar(p.id, p.nome)}
                          >
                            {processando ? 'Processando...' : 'Exportar'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
