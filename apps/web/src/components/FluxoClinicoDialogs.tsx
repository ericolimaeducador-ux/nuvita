import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { avaliacaoIUApi, laudoMedicoApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import {
  LocalAtendimento, PerfilCliente, Destreza, TipoIU, EncaminhamentoIU,
  LOCAL_LABEL, PERFIL_LABEL, DESTREZA_LABEL, TIPO_IU_LABEL, ENCAMINHAMENTO_LABEL,
  type AvaliacaoIU, type Produto,
} from '@/types';

/**
 * Formulários de avaliação IU e laudo reaproveitados fora do fluxo clínico —
 * usados também direto na tela do paciente. Criar é append-only (cada submit
 * novo cria um registro). A avaliação também aceita EDIÇÃO (`avaliacao` prop):
 * corrige a própria ficha, ex.: completar o COREN esquecido. `onCreated` deixa
 * o chamador revalidar suas próprias queries (as chaves diferem entre telas).
 */

export function NovaAvaliacaoIUDialog({
  open, onOpenChange, pacienteId, clinicaId, produtos, onCreated,
  avaliacao, enfermeiroRegistro,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pacienteId: string;
  clinicaId?: string;
  produtos: Produto[];
  onCreated: () => void;
  /** Quando presente, o diálogo edita esta avaliação em vez de criar uma nova. */
  avaliacao?: AvaliacaoIU;
  /** COREN/registro do profissional logado — pré-preenche o campo ao criar. */
  enfermeiroRegistro?: string;
}) {
  const editando = !!avaliacao;
  const { register, handleSubmit, setValue, watch, reset } = useForm<Record<string, unknown>>();

  // Preenche o formulário ao abrir: com os dados da ficha (edição) ou só o
  // COREN do perfil (criação). Reexecuta quando muda o alvo de edição.
  useEffect(() => {
    if (!open) return;
    if (avaliacao) {
      reset({
        dataAtendimento: avaliacao.dataAtendimento ? avaliacao.dataAtendimento.slice(0, 10) : '',
        local: avaliacao.local,
        planoSaude: avaliacao.planoSaude ?? '',
        hospitalReferencia: avaliacao.hospitalReferencia ?? '',
        motivoIU: avaliacao.motivoIU ?? '',
        inicioSintomas: avaliacao.inicioSintomas ?? '',
        perfilCliente: avaliacao.perfilCliente,
        destreza: avaliacao.destreza,
        tiposIU: avaliacao.tiposIU ?? [],
        miccaoEspontanea: avaliacao.miccaoEspontanea,
        realizaCateterismo: avaliacao.realizaCateterismo,
        cateterismosDia: avaliacao.cateterismosDia,
        cateterUtilizado: avaliacao.cateterUtilizado ?? '',
        volumeDrenadoMl: avaliacao.volumeDrenadoMl ?? '',
        outrasIntercorrencias: avaliacao.outrasIntercorrencias ?? '',
        produtoIndicado: avaliacao.produtoIndicado,
        responsavelCateterismo: avaliacao.responsavelCateterismo ?? '',
        encaminhamento: avaliacao.encaminhamento,
        coren: avaliacao.coren ?? '',
        autorizaPesquisa: avaliacao.autorizaPesquisa,
        aceitaInformacoes: avaliacao.aceitaInformacoes,
      });
    } else {
      reset({ coren: enfermeiroRegistro ?? '', tiposIU: [] });
    }
  }, [open, avaliacao, enfermeiroRegistro, reset]);

  const mut = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      editando ? avaliacaoIUApi.update(avaliacao!.id, payload) : avaliacaoIUApi.create(payload),
    onSuccess: () => {
      toast.success(editando ? 'Avaliação atualizada.' : 'Avaliação registrada.');
      onOpenChange(false);
      onCreated();
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const tiposIU = (watch('tiposIU') as TipoIU[] | undefined) ?? [];
  const produtoSel = watch('produtoIndicado') as { codigo: number } | undefined;

  function toggleTipoIU(tipo: TipoIU) {
    const atual = tiposIU.includes(tipo) ? tiposIU.filter((t) => t !== tipo) : [...tiposIU, tipo];
    setValue('tiposIU', atual);
  }

  function onSubmit(v: Record<string, unknown>) {
    const base = {
      ...v,
      clinicaId,
      tiposIU,
      dntui: !!v.dntui,
      miccaoEspontanea: !!v.miccaoEspontanea,
      realizaCateterismo: !!v.realizaCateterismo,
      emTratamento: !!v.emTratamento,
      autorizaPesquisa: !!v.autorizaPesquisa,
      aceitaInformacoes: !!v.aceitaInformacoes,
    };
    // No PATCH a API rejeita campos fora do DTO (forbidNonWhitelisted): pacienteId
    // só entra na criação.
    mut.mutate(editando ? base : { ...base, pacienteId });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editando ? 'Editar avaliação' : 'Ficha de Avaliação'} — Incontinência Urinária
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Data do atendimento</Label>
              <Input type="date" {...register('dataAtendimento', { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>Local</Label>
              <Select value={(watch('local') as string) || undefined} onValueChange={(v) => setValue('local', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.values(LocalAtendimento).map((l) => (
                    <SelectItem key={l} value={l}>{LOCAL_LABEL[l]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Plano de saúde</Label>
              <Input placeholder="Ex: SUS" {...register('planoSaude')} />
            </div>
            <div className="space-y-1">
              <Label>Hospital referência</Label>
              <Input {...register('hospitalReferencia')} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Motivo da IU / Diagnóstico</Label>
            <Input placeholder="Ex: LM T3-T4 pós cirurgia" {...register('motivoIU', { required: true })} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Perfil do cliente</Label>
              <Select value={(watch('perfilCliente') as string) || undefined} onValueChange={(v) => setValue('perfilCliente', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.values(PerfilCliente).map((p) => (
                    <SelectItem key={p} value={p}>{PERFIL_LABEL[p]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Destreza</Label>
              <Select value={(watch('destreza') as string) || undefined} onValueChange={(v) => setValue('destreza', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.values(Destreza).map((d) => (
                    <SelectItem key={d} value={d}>{DESTREZA_LABEL[d]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Início dos sintomas</Label>
              <Input placeholder="Ex: Junho 2025" {...register('inicioSintomas')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de IU (marque todos aplicáveis)</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.values(TipoIU).map((tipo) => (
                <div key={tipo} className="flex items-center gap-2">
                  <Checkbox
                    id={`av_${tipo}`}
                    checked={tiposIU.includes(tipo)}
                    onCheckedChange={() => toggleTipoIU(tipo)}
                  />
                  <Label htmlFor={`av_${tipo}`} className="text-sm cursor-pointer">{TIPO_IU_LABEL[tipo]}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Checkbox id="av_miccao" checked={!!watch('miccaoEspontanea')} onCheckedChange={(c) => setValue('miccaoEspontanea', !!c)} />
              <Label htmlFor="av_miccao" className="cursor-pointer">Micção espontânea</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="av_cateterismo" checked={!!watch('realizaCateterismo')} onCheckedChange={(c) => setValue('realizaCateterismo', !!c)} />
              <Label htmlFor="av_cateterismo" className="cursor-pointer">Realiza cateterismo</Label>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Cateterismos/dia</Label>
              <Input type="number" {...register('cateterismosDia', { valueAsNumber: true })} />
            </div>
            <div className="space-y-1">
              <Label>Catéter utilizado</Label>
              <Input placeholder="Ex: 12Fr convencional" {...register('cateterUtilizado')} />
            </div>
            <div className="space-y-1">
              <Label>Volume drenado</Label>
              <Input placeholder="Ex: 300-400ml" {...register('volumeDrenadoMl')} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Outras intercorrências / medicamentos</Label>
            <Input placeholder="Ex: Doxazosina 2mg 1x/dia" {...register('outrasIntercorrencias')} />
          </div>

          <div className="space-y-2">
            <Label>Produto indicado</Label>
            <Select
              value={produtoSel ? String(produtoSel.codigo) : undefined}
              onValueChange={(v) => {
                const p = produtos.find((pr) => pr.codigo === Number(v));
                if (p) setValue('produtoIndicado', { codigo: p.codigo, sexo: p.sexo, french: p.french ?? 0 });
              }}
            >
              <SelectTrigger><SelectValue placeholder="Selecione o catéter" /></SelectTrigger>
              <SelectContent>
                {produtos.map((p) => (
                  <SelectItem key={p.codigo} value={String(p.codigo)}>
                    {p.nome} — Cód. {p.codigo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Encaminhamento</Label>
            <Select value={(watch('encaminhamento') as string) || undefined} onValueChange={(v) => setValue('encaminhamento', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {Object.values(EncaminhamentoIU).map((e) => (
                  <SelectItem key={e} value={e}>{ENCAMINHAMENTO_LABEL[e]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>COREN</Label>
              <Input placeholder="Seu registro COREN" {...register('coren')} />
            </div>
            <div className="space-y-1">
              <Label>Responsável pelo cateterismo</Label>
              <Input placeholder="Ex: O próprio" {...register('responsavelCateterismo')} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox id="av_autoriza" checked={!!watch('autorizaPesquisa')} onCheckedChange={(c) => setValue('autorizaPesquisa', !!c)} />
              <Label htmlFor="av_autoriza" className="text-sm cursor-pointer">
                Paciente autoriza uso de dados para pesquisa
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="av_aceita" checked={!!watch('aceitaInformacoes')} onCheckedChange={(c) => setValue('aceitaInformacoes', !!c)} />
              <Label htmlFor="av_aceita" className="text-sm cursor-pointer">
                Aceita receber informações por e-mail/WhatsApp
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? 'Salvando...' : editando ? 'Salvar alterações' : 'Registrar avaliação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NovoLaudoDialog({
  open, onOpenChange, pacienteId, clinicaId, produtos, avaliacaoId, produtoIndicado, onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pacienteId: string;
  clinicaId?: string;
  produtos: Produto[];
  avaliacaoId?: string;
  produtoIndicado?: AvaliacaoIU['produtoIndicado'];
  onCreated: () => void;
}) {
  const { register, handleSubmit, setValue, watch, reset } = useForm<Record<string, unknown>>();

  const mut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => laudoMedicoApi.create(payload),
    onSuccess: () => {
      toast.success('Laudo criado.');
      onOpenChange(false); reset();
      onCreated();
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        // Ao abrir, marca por padrão o produto indicado na avaliação (se houver).
        if (o && produtoIndicado) setValue(`prod_${produtoIndicado.codigo}`, true);
      }}
    >
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Laudo Médico — Solicitação SUS</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit((v) => mut.mutate({
          pacienteId, avaliacaoIuId: avaliacaoId, clinicaId,
          dataLaudo: v.dataLaudo,
          justificativaMedica: v.justificativaMedica,
          fundamentoLegal: v.fundamentoLegal,
          cid10: String(v.cid10 ?? '').split(',').map((s: string) => s.trim()).filter(Boolean),
          produtosSolicitados: produtos.filter((p) => v[`prod_${p.codigo}`]).map((p) => ({
            codigo: p.codigo, descricao: p.nome,
            quantidade: Number(v[`qty_${p.codigo}`] ?? 1) || 1,
            unidade: 'unidade', codigoSiafisico: p.codigoSiafisico,
          })),
        }))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Data do laudo</Label>
              <Input type="date" {...register('dataLaudo', { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>CID-10 (separados por vírgula)</Label>
              <Input placeholder="G82.2, N31.2" {...register('cid10')} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Justificativa médica</Label>
            <Textarea rows={4} placeholder="Descreva a condição clínica e necessidade médica..." {...register('justificativaMedica', { required: true })} />
          </div>
          <div className="space-y-1">
            <Label>Fundamento legal</Label>
            <Textarea rows={2} placeholder="Lei nº 8.080/90, art. 6º — direito à assistência terapêutica integral..." {...register('fundamentoLegal', { required: true })} />
          </div>
          <div className="space-y-2">
            <Label>Produtos solicitados</Label>
            {produtos.map((p) => (
              <div key={p.codigo} className="flex items-center gap-3">
                <Checkbox
                  id={`ld_prod_${p.codigo}`}
                  checked={!!watch(`prod_${p.codigo}`)}
                  onCheckedChange={(c) => setValue(`prod_${p.codigo}`, !!c)}
                />
                <Label htmlFor={`ld_prod_${p.codigo}`} className="text-sm flex-1 cursor-pointer">
                  {p.nome}
                  {produtoIndicado?.codigo === p.codigo && (
                    <Badge variant="success" className="ml-2 text-xs">Indicado na avaliação</Badge>
                  )}
                </Label>
                {!!watch(`prod_${p.codigo}`) && (
                  <Input type="number" min={1} defaultValue={1} className="w-20" {...register(`qty_${p.codigo}`, { valueAsNumber: true })} />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>{mut.isPending ? 'Salvando...' : 'Criar laudo'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
