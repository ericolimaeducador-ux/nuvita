import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { LifeBuoy } from 'lucide-react';
import { ticketsApi, type Ticket } from '@/api/tickets';
import { AtenderTicketDialog, RecusarTicketDialog } from '@/components/CorrecaoIdentidadeDialogs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

/** Fila do SUPER_ADMIN: tickets abertos da clínica selecionada no seletor do topo. */
export function TicketsPage() {
  const [atender, setAtender] = useState<Ticket | null>(null);
  const [recusar, setRecusar] = useState<Ticket | null>(null);
  const q = useQuery({ queryKey: ['tickets', 'abertos'], queryFn: () => ticketsApi.listarAbertos() });
  const tickets = q.data ?? [];

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <LifeBuoy className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Tickets de correção</h1>
        <Badge variant="secondary">{tickets.length}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Solicitações de correção de nome, CPF ou data de nascimento da clínica selecionada.
      </p>

      <Card>
        <CardContent className="p-0">
          {q.isLoading ? (
            <div className="space-y-2 p-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          ) : tickets.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhum ticket aberto.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aberto em</TableHead>
                  <TableHead>Justificativa</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap">{dayjs(t.abertoEm).format('DD/MM/YYYY HH:mm')}</TableCell>
                    <TableCell className="max-w-md whitespace-pre-wrap">{t.justificativa}</TableCell>
                    <TableCell>
                      <Link className="text-primary underline underline-offset-2" to={`/pacientes/${t.pacienteId}`}>
                        Abrir paciente
                      </Link>
                    </TableCell>
                    <TableCell className="space-x-2 text-right whitespace-nowrap">
                      <Button size="sm" onClick={() => setAtender(t)}>Atender</Button>
                      <Button size="sm" variant="outline" onClick={() => setRecusar(t)}>Recusar</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AtenderTicketDialog ticket={atender} onClose={() => setAtender(null)} />
      <RecusarTicketDialog ticket={recusar} onClose={() => setRecusar(null)} />
    </div>
  );
}
