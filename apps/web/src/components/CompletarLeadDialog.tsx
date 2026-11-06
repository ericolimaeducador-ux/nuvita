import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { apiErrorMessage } from '@/api/client';
import { captacaoApi, type CaptacaoPendente } from '@/api/resources';

/**
 * Completa um lead pendente ANTES de exportar (ex.: data de nascimento, que o formulário público não exige). Só salva —
 * a exportação continua sendo uma ação separada. Para menor de idade, mostra os dados do responsável legal e a
 * confirmação da autorização (a exportação do menor exige os dois; o servidor confere).
 */

interface FormLead {
  nome: string;
  cpf: string;
  dataNascimento: string;
  endereco: string;
  email: string;
  respNome: string;
  respCpf: string;
  respTelefone: string;
  respEmail: string;
  respVinculo: string;
  autorizacao: boolean;
}

function doLead(l: CaptacaoPendente): FormLead {
  return {
    nome: l.nome ?? '',
    cpf: l.cpf ?? '',
    dataNascimento: l.dataNascimento ? l.dataNascimento.slice(0, 10) : '',
    endereco: l.endereco ?? '',
    email: l.email ?? '',
    respNome: l.responsavelLegal?.nome ?? '',
    respCpf: l.responsavelLegal?.cpf ?? '',
    respTelefone: l.responsavelLegal?.telefone ?? '',
    respEmail: l.responsavelLegal?.email ?? '',
    respVinculo: l.responsavelLegal?.vinculo ?? '',
    autorizacao: l.autorizacaoResponsavel?.confirmado ?? false,
  };
}

function menorDeIdade(dataNascimento: string): boolean {
  return !!dataNascimento && dayjs().diff(dayjs(dataNascimento), 'year') < 18;
}

/** Só o que foi preenchido vai no PATCH (campo vazio não apaga nada no servidor). */
function paraPayload(f: FormLead): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  if (f.nome.trim()) p.nome = f.nome.trim();
  if (f.cpf.trim()) p.cpf = f.cpf.trim();
  if (f.dataNascimento) p.dataNascimento = f.dataNascimento;
  if (f.endereco.trim()) p.endereco = f.endereco.trim();
  if (f.email.trim()) p.email = f.email.trim();
  if (menorDeIdade(f.dataNascimento)) {
    const r: Record<string, string> = {};
    if (f.respNome.trim()) r.nome = f.respNome.trim();
    if (f.respCpf.trim()) r.cpf = f.respCpf.trim();
    if (f.respTelefone.trim()) r.telefone = f.respTelefone.trim();
    if (f.respEmail.trim()) r.email = f.respEmail.trim();
    if (f.respVinculo.trim()) r.vinculo = f.respVinculo.trim();
    if (Object.keys(r).length > 0) p.responsavelLegal = r;
    p.autorizacaoResponsavel = { confirmado: f.autorizacao };
  }
  return p;
}

export function CompletarLeadDialog({
  lead, onClose, onSalvo,
}: { lead: CaptacaoPendente | null; onClose: () => void; onSalvo: () => void }) {
  const [form, setForm] = useState<FormLead>(() => (lead ? doLead(lead) : doLead({} as CaptacaoPendente)));
  useEffect(() => {
    if (lead) setForm(doLead(lead));
  }, [lead]);

  const set = <K extends keyof FormLead>(k: K, v: FormLead[K]) => setForm((f) => ({ ...f, [k]: v }));
  const menor = menorDeIdade(form.dataNascimento);
  const payload = paraPayload(form);

  const salvar = useMutation({
    mutationFn: () => captacaoApi.atualizar(lead!.id, payload),
    onSuccess: () => {
      toast.success('Captação atualizada.', 'Agora você pode exportar o paciente.');
      onSalvo();
      onClose();
    },
    onError: (e) => toast.error('Não foi possível salvar', apiErrorMessage(e)),
  });

  return (
    <Dialog open={lead !== null} onOpenChange={(aberto) => { if (!aberto) onClose(); }}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Completar captação</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          Preencha o que falta para poder exportar. Salvar não exporta o paciente.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="leadNome">Nome</Label>
            <Input id="leadNome" value={form.nome} onChange={(e) => set('nome', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="leadCpf">CPF</Label>
            <Input id="leadCpf" inputMode="numeric" placeholder="Deixe em branco se não souber" value={form.cpf} onChange={(e) => set('cpf', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="leadNasc">Data de nascimento</Label>
            <Input id="leadNasc" type="date" max={dayjs().format('YYYY-MM-DD')} value={form.dataNascimento} onChange={(e) => set('dataNascimento', e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="leadEnd">Endereço</Label>
            <Input id="leadEnd" value={form.endereco} onChange={(e) => set('endereco', e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="leadEmail">E-mail</Label>
            <Input id="leadEmail" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>

          {menor && (
            <fieldset className="col-span-2 grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
              <legend className="px-1 text-sm font-medium">Responsável legal (paciente menor de idade)</legend>
              <div className="space-y-1.5">
                <Label htmlFor="respNome">Nome do responsável</Label>
                <Input id="respNome" value={form.respNome} onChange={(e) => set('respNome', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="respCpf">CPF do responsável</Label>
                <Input id="respCpf" inputMode="numeric" value={form.respCpf} onChange={(e) => set('respCpf', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="respTel">Telefone do responsável</Label>
                <Input id="respTel" type="tel" value={form.respTelefone} onChange={(e) => set('respTelefone', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="respEmail">E-mail do responsável</Label>
                <Input id="respEmail" type="email" value={form.respEmail} onChange={(e) => set('respEmail', e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="respVinculo">Vínculo</Label>
                <Input id="respVinculo" placeholder="Ex.: mãe, pai, tutor" value={form.respVinculo} onChange={(e) => set('respVinculo', e.target.value)} />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Checkbox id="respAut" checked={form.autorizacao} onCheckedChange={(c) => set('autorizacao', !!c)} />
                <Label htmlFor="respAut">Autorização do responsável legal confirmada</Label>
              </div>
            </fieldset>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={Object.keys(payload).length === 0 || salvar.isPending} onClick={() => salvar.mutate()}>
            {salvar.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
