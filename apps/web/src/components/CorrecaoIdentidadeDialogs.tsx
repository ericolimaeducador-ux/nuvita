import { useSaidaProtegida } from '@/lib/saida-protegida';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { apiErrorMessage } from '@/api/client';
import { corrigirIdentidadePaciente, ticketsApi, TICKET_STATUS_LABEL, type Ticket } from '@/api/tickets';
import { ErroConsulta } from '@/components/ErroConsulta';
import { RespostaInvalidaError } from '@/lib/consulta';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';

const CPF_RE = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;

/** Abre o ticket "Correção de dados de identidade" para o SUPER_ADMIN (secretária, psicólogo, admin). */
export function SolicitarCorrecaoDialog({
  open,
  onOpenChange,
  pacienteId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pacienteId: string;
}) {
  const qc = useQueryClient();
  const [justificativa, setJustificativa] = useState('');
  // Clique fora/ESC não fecham; Cancelar/X com justificativa digitada pede confirmação.
  const saida = useSaidaProtegida(!!justificativa.trim(), () => { setJustificativa(''); onOpenChange(false); });

  const mut = useMutation({
    mutationFn: () => ticketsApi.abrir({ pacienteId, justificativa: justificativa.trim() }),
    onSuccess: () => {
      toast.success('Solicitação enviada ao administrador da plataforma.');
      setJustificativa('');
      onOpenChange(false);
      void qc.invalidateQueries({ queryKey: ['tickets', 'paciente', pacienteId] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={saida.onOpenChange}>
      <DialogContent className="max-w-md" {...saida.contentProps}>
        <DialogHeader>
          <DialogTitle>Solicitar correção de dados</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Nome, CPF e data de nascimento só podem ser corrigidos pelo administrador da plataforma. Explique o erro e
          informe o valor correto.
        </p>
        <div className="space-y-2">
          <Label htmlFor="solicitarJustificativa">Justificativa</Label>
          <Textarea
            id="solicitarJustificativa"
            rows={5}
            maxLength={2000}
            placeholder="Ex.: CPF digitado incorretamente no cadastro inicial, o correto é 000.000.000-00"
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={saida.solicitarFechar}>Cancelar</Button>
          <Button disabled={!justificativa.trim() || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Enviando...' : 'Enviar solicitação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CamposCorrecao {
  nome: string;
  cpf: string;
  dataNascimento: string;
}

function CamposIdentidade({ valores, onChange }: { valores: CamposCorrecao; onChange: (v: CamposCorrecao) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Preencha apenas o que precisa ser corrigido.</p>
      <div className="space-y-2">
        <Label htmlFor="corrNome">Nome</Label>
        <Input id="corrNome" value={valores.nome} onChange={(e) => onChange({ ...valores, nome: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="corrCpf">CPF</Label>
          <Input id="corrCpf" placeholder="000.000.000-00" value={valores.cpf} onChange={(e) => onChange({ ...valores, cpf: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="corrNasc">Nascimento</Label>
          <Input id="corrNasc" type="date" value={valores.dataNascimento} onChange={(e) => onChange({ ...valores, dataNascimento: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

function payloadDe(v: CamposCorrecao) {
  return {
    ...(v.nome.trim() ? { nome: v.nome.trim() } : {}),
    ...(v.cpf.trim() ? { cpf: v.cpf.trim() } : {}),
    ...(v.dataNascimento ? { dataNascimento: dayjs(v.dataNascimento).format('YYYY-MM-DD') } : {}),
  };
}

function validar(v: CamposCorrecao): string | null {
  if (!v.nome.trim() && !v.cpf.trim() && !v.dataNascimento) return 'Informe ao menos um campo para corrigir.';
  if (v.cpf.trim() && !CPF_RE.test(v.cpf.trim())) return 'CPF inválido.';
  return null;
}

const VAZIO: CamposCorrecao = { nome: '', cpf: '', dataNascimento: '' };

/** Correção direta do SUPER_ADMIN na tela do paciente — sempre com justificativa. */
export function CorrigirIdentidadeDialog({
  open,
  onOpenChange,
  pacienteId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pacienteId: string;
}) {
  const qc = useQueryClient();
  const [campos, setCampos] = useState<CamposCorrecao>(VAZIO);
  const [justificativa, setJustificativa] = useState('');
  const erro = validar(campos);

  const mut = useMutation({
    mutationFn: () => corrigirIdentidadePaciente(pacienteId, { ...payloadDe(campos), justificativa: justificativa.trim() }),
    onSuccess: () => {
      toast.success('Identidade corrigida. A versão anterior foi preservada.');
      setCampos(VAZIO);
      setJustificativa('');
      onOpenChange(false);
      void qc.invalidateQueries({ queryKey: ['paciente', pacienteId] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Corrigir dados de identidade</DialogTitle>
        </DialogHeader>
        <CamposIdentidade valores={campos} onChange={setCampos} />
        <div className="space-y-2">
          <Label htmlFor="corrJustificativa">Justificativa</Label>
          <Textarea id="corrJustificativa" rows={3} maxLength={2000} value={justificativa} onChange={(e) => setJustificativa(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!!erro || !justificativa.trim() || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Salvando...' : 'Aplicar correção'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** SUPER_ADMIN atende o ticket: informa os valores corretos; a justificativa vem do próprio ticket. */
export function AtenderTicketDialog({ ticket, onClose }: { ticket: Ticket | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [campos, setCampos] = useState<CamposCorrecao>(VAZIO);
  const erro = validar(campos);

  const mut = useMutation({
    mutationFn: () => ticketsApi.atender(ticket!.id, payloadDe(campos)),
    onSuccess: () => {
      toast.success('Correção aplicada e ticket atendido.');
      setCampos(VAZIO);
      onClose();
      void qc.invalidateQueries({ queryKey: ['tickets'] });
      void qc.invalidateQueries({ queryKey: ['paciente', ticket?.pacienteId] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  return (
    <Dialog open={!!ticket} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atender ticket</DialogTitle>
        </DialogHeader>
        <div className="rounded-md bg-muted p-3 text-sm">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Justificativa de quem solicitou</p>
          <p className="whitespace-pre-wrap text-foreground">{ticket?.justificativa}</p>
        </div>
        <CamposIdentidade valores={campos} onChange={setCampos} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!!erro || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Aplicando...' : 'Aplicar correção e atender'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RecusarTicketDialog({ ticket, onClose }: { ticket: Ticket | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [motivo, setMotivo] = useState('');

  const mut = useMutation({
    mutationFn: () => ticketsApi.recusar(ticket!.id, motivo.trim()),
    onSuccess: () => {
      toast.success('Ticket recusado.');
      setMotivo('');
      onClose();
      void qc.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  return (
    <Dialog open={!!ticket} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Recusar ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="recusarMotivo">Motivo da recusa</Label>
          <Textarea id="recusarMotivo" rows={4} maxLength={1000} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" disabled={!motivo.trim() || mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? 'Recusando...' : 'Recusar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_VARIANT = { ABERTO: 'warning', ATENDIDO: 'success', RECUSADO: 'secondary' } as const;

/** Tickets do paciente: quem abriu vê aqui se a correção foi atendida ou recusada (e por quê). */
export function TicketsDoPaciente({ pacienteId }: { pacienteId: string }) {
  const q = useQuery({
    queryKey: ['tickets', 'paciente', pacienteId],
    queryFn: () => ticketsApi.listarPorPaciente(pacienteId),
    enabled: !!pacienteId,
  });
  if (q.isLoading) return null;

  // Falha explícita: erro da API ou resposta que não é lista (ex.: HTML de gateway/proxy)
  // nunca pode aparecer como "sem tickets" — paciente com solicitações parecendo sem nenhuma.
  if (q.isError || !Array.isArray(q.data)) {
    return (
      <ErroConsulta
        className="mt-4"
        erro={q.error ?? new RespostaInvalidaError()}
        refetch={q.refetch}
        recurso="as solicitações de correção deste paciente"
      />
    );
  }

  const tickets = q.data;
  if (tickets.length === 0) return null;

  return (
    <div className="mt-4 space-y-2" data-testid="tickets-do-paciente">
      <p className="text-sm font-semibold text-foreground">Solicitações de correção</p>
      {tickets.map((t) => (
        <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3 text-sm">
          <Badge variant={STATUS_VARIANT[t.status]}>{TICKET_STATUS_LABEL[t.status]}</Badge>
          <span className="text-muted-foreground">aberta em {dayjs(t.abertoEm).format('DD/MM/YYYY HH:mm')}</span>
          {t.status === 'ATENDIDO' && t.resolvidoEm && (
            <span className="text-muted-foreground">· corrigida em {dayjs(t.resolvidoEm).format('DD/MM/YYYY HH:mm')}</span>
          )}
          {t.status === 'RECUSADO' && t.motivoRecusa && (
            <span className="w-full text-muted-foreground">Motivo da recusa: {t.motivoRecusa}</span>
          )}
        </div>
      ))}
    </div>
  );
}
