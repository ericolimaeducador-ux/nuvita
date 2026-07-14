import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, Trash2 } from 'lucide-react';
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
import { useAuth } from '@/auth/AuthContext';
import {
  LocalAtendimento, PerfilCliente, Destreza, TipoIU, EncaminhamentoIU, Papel, StatusLaudoMedico,
  LOCAL_LABEL, PERFIL_LABEL, DESTREZA_LABEL, TIPO_IU_LABEL, ENCAMINHAMENTO_LABEL,
  type AvaliacaoIU, type LaudoMedico, type Produto,
} from '@/types';

/**
 * Formulários de avaliação IU e laudo reaproveitados fora do fluxo clínico —
 * usados também direto na tela do paciente. Criar é append-only (cada submit
 * novo cria um registro). A avaliação também aceita EDIÇÃO (`avaliacao` prop):
 * corrige a própria ficha, ex.: completar o COREN esquecido. `onCreated` deixa
 * o chamador revalidar suas próprias queries (as chaves diferem entre telas).
 */

/** Confirmação de exclusão (soft-delete) reutilizada por avaliação IU, laudo e follow-up. */
export function ConfirmExcluirDialog({ open, titulo, descricao, pending, onCancel, onConfirm }: {
  open: boolean; titulo: string; descricao: React.ReactNode; pending: boolean;
  onCancel: () => void; onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{titulo}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{descricao}</p>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={pending}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={pending}>
            <Trash2 className="mr-2 h-4 w-4" /> {pending ? 'Excluindo…' : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
              <Label>COREN/CRM</Label>
              <Input placeholder="Seu registro profissional" {...register('coren')} />
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

/**
 * Defaults do Relatório Médico Judiciário (formato narrativo CIL), espelhando
 * packages/shared/src/laudo-medico/laudo-medico-defaults.ts — o frontend não
 * importa esse pacote em runtime (mesma convenção já usada por outros enums
 * "espelhados" em src/types.ts), então mantemos a mesma lista aqui.
 */
const LAUDO_MEDICO_BOOLEAN_DEFAULTS = {
  riscoEsvaziamento: true,
  riscoItuAtual: false,
  riscoAntibioticoterapia: false,
  riscoTratoSuperior: true,
  riscoInsuficienciaRenal: true,
  riscoLesaoUretral: true,
  riscoPerdasNoturnas: false,
  deficienciaLubrificacao: true,
  deficienciaPontaProtetora: true,
  deficienciaMangaProtetora: true,
  deficienciaDor: false,
  deficienciaAlergiaLidocaina: false,
  deficienciaFrascoReutilizado: false,
  deficienciaRiscoInternacao: false,
  prescricaoIncluirCodigoFabricante: true,
  prescricaoEmbalagemPocket: false,
  prescricaoClausulaMarca: true,
  prescricaoCateterExterno: false,
  prescricaoIncluirObjetivo: true,
  prescricaoIncluirConclusao: true,
} as const;
const CATETER_EXTERNO_DEFAULTS = { incluirDescricaoTecnica: true, incluirCodigoSiafisico: true } as const;
const ESPECIALIDADE_DEFAULT = 'Urologia';

/** `checked={!!watch(id)}` + `onCheckedChange` — padrão já usado neste arquivo (ver `av_autoriza`/`av_aceita`). */
function CheckboxField({ id, label, watch, setValue }: {
  id: string; label: string; watch: (n: string) => unknown; setValue: (n: string, v: unknown) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-2 text-sm cursor-pointer py-0.5">
      <Checkbox id={id} className="mt-0.5" checked={!!watch(id)} onCheckedChange={(c) => setValue(id, !!c)} />
      <span>{label}</span>
    </label>
  );
}

export function NovoLaudoDialog({
  open, onOpenChange, pacienteId, clinicaId, produtos, avaliacaoId, produtoIndicado, laudo, onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pacienteId: string;
  clinicaId?: string;
  produtos: Produto[];
  avaliacaoId?: string;
  produtoIndicado?: AvaliacaoIU['produtoIndicado'];
  /** Quando presente, o diálogo revisa este relatório (rascunho/aguardando revisão) em vez de criar um novo. */
  laudo?: LaudoMedico;
  onCreated: () => void;
}) {
  const { user } = useAuth();
  const editando = !!laudo;
  const podeAssinar = user?.papel === Papel.MEDICO || user?.papel === Papel.ADMIN;
  const avaliacaoIuId = avaliacaoId ?? laudo?.avaliacaoIuId;
  const { register, handleSubmit, setValue, watch, reset } = useForm<Record<string, unknown>>();

  const produtosVapro = produtos.filter((p) => p.tipo === 'cateter_vapro');
  const produtosExterno = produtos.filter((p) => p.tipo === 'coletor_acticoat');
  const produtosOutros = produtos.filter((p) => p.tipo !== 'cateter_vapro' && p.tipo !== 'coletor_acticoat');
  const prescricaoCateterExterno = !!watch('prescricaoCateterExterno');

  // Preenche o formulário ao abrir: com os dados do relatório (revisão) ou com
  // os defaults do modelo (criação). Reexecuta quando muda o alvo de edição.
  useEffect(() => {
    if (!open) return;
    if (laudo) {
      const base: Record<string, unknown> = {
        dataLaudo: laudo.dataLaudo ? laudo.dataLaudo.slice(0, 10) : '',
        cid10: laudo.cid10.join(', '),
        contextoSocial: laudo.contextoSocial ?? '',
        etiologia: laudo.etiologia,
        nivelLesao: laudo.nivelLesao ?? '',
        diagnosticoFuncional: laudo.diagnosticoFuncional,
        regimeCil: laudo.regimeCil,
        insumoAtual: laudo.insumoAtual,
        fornecedorAtual: laudo.fornecedorAtual ?? '',
        riscoEsvaziamento: laudo.riscoEsvaziamento,
        riscoItuAtual: laudo.riscoItuAtual,
        riscoAntibioticoterapia: laudo.riscoAntibioticoterapia,
        riscoTratoSuperior: laudo.riscoTratoSuperior,
        riscoInsuficienciaRenal: laudo.riscoInsuficienciaRenal,
        riscoLesaoUretral: laudo.riscoLesaoUretral,
        riscoPerdasNoturnas: laudo.riscoPerdasNoturnas,
        deficienciaLubrificacao: laudo.deficienciaLubrificacao,
        deficienciaPontaProtetora: laudo.deficienciaPontaProtetora,
        deficienciaMangaProtetora: laudo.deficienciaMangaProtetora,
        deficienciaDor: laudo.deficienciaDor,
        deficienciaAlergiaLidocaina: laudo.deficienciaAlergiaLidocaina,
        deficienciaFrascoReutilizado: laudo.deficienciaFrascoReutilizado,
        deficienciaRiscoInternacao: laudo.deficienciaRiscoInternacao,
        prescricaoIncluirCodigoFabricante: laudo.prescricaoIncluirCodigoFabricante,
        prescricaoEmbalagemPocket: laudo.prescricaoEmbalagemPocket,
        prescricaoClausulaMarca: laudo.prescricaoClausulaMarca,
        prescricaoCateterExterno: laudo.prescricaoCateterExterno,
        prescricaoIncluirObjetivo: laudo.prescricaoIncluirObjetivo,
        prescricaoIncluirConclusao: laudo.prescricaoIncluirConclusao,
        cateterExterno_incluirDescricaoTecnica: laudo.cateterExterno?.incluirDescricaoTecnica ?? CATETER_EXTERNO_DEFAULTS.incluirDescricaoTecnica,
        cateterExterno_incluirCodigoSiafisico: laudo.cateterExterno?.incluirCodigoSiafisico ?? CATETER_EXTERNO_DEFAULTS.incluirCodigoSiafisico,
        comparativoAnvisa: laudo.comparativoAnvisa ?? '',
        medicoNomeExibicao: laudo.medicoNomeExibicao ?? '',
        medicoEspecialidade: laudo.medicoEspecialidade ?? ESPECIALIDADE_DEFAULT,
        crmExibicao: laudo.crmExibicao ?? '',
        cidadeEmissao: laudo.cidadeEmissao ?? '',
      };
      laudo.produtosSolicitados.forEach((p) => {
        base[`prod_${p.codigo}`] = true;
        base[`qty_${p.codigo}`] = p.quantidade;
      });
      reset(base);
    } else {
      reset({ ...LAUDO_MEDICO_BOOLEAN_DEFAULTS, medicoEspecialidade: ESPECIALIDADE_DEFAULT, ...CATETER_EXTERNO_DEFAULTS });
      if (produtoIndicado) setValue(`prod_${produtoIndicado.codigo}`, true);
    }
  }, [open, laudo, produtoIndicado, reset, setValue]);

  const mut = useMutation({
    mutationFn: async ({ payload, acao }: { payload: Record<string, unknown>; acao: 'salvar' | 'encaminhar' | 'assinar' }) => {
      const salvo = editando ? await laudoMedicoApi.update(laudo!.id, payload) : await laudoMedicoApi.create(payload);
      const id = editando ? laudo!.id : salvo.id;
      if (acao === 'encaminhar') return laudoMedicoApi.encaminhar(id);
      if (acao === 'assinar') return laudoMedicoApi.assinar(id, (payload.crmExibicao as string) || undefined);
      return salvo;
    },
    onSuccess: (_r, { acao }) => {
      toast.success(
        acao === 'assinar' ? 'Relatório assinado.'
        : acao === 'encaminhar' ? 'Relatório encaminhado para revisão médica.'
        : 'Rascunho salvo.',
      );
      onOpenChange(false); reset();
      onCreated();
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const iaMut = useMutation({
    mutationFn: () => laudoMedicoApi.preencherComIA(pacienteId, avaliacaoIuId!),
    onSuccess: (r) => {
      setValue('cid10', r.cid10.join(', '));
      setValue('contextoSocial', r.contextoSocial);
      setValue('etiologia', r.etiologia);
      setValue('nivelLesao', r.nivelLesao);
      setValue('diagnosticoFuncional', r.diagnosticoFuncional);
      setValue('regimeCil', r.regimeCil);
      setValue('insumoAtual', r.insumoAtual);
      setValue('fornecedorAtual', r.fornecedorAtual);
      toast.success('Rascunho pré-preenchido pela IA', 'Revise o texto — trechos entre colchetes precisam ser completados.');
    },
    onError: (e) => toast.error('Não foi possível pré-preencher com IA', apiErrorMessage(e)),
  });

  function montarPayload(v: Record<string, unknown>): Record<string, unknown> {
    const base: Record<string, unknown> = {
      dataLaudo: v.dataLaudo,
      cid10: String(v.cid10 ?? '').split(',').map((s: string) => s.trim()).filter(Boolean),

      contextoSocial: v.contextoSocial || undefined,
      etiologia: v.etiologia,
      nivelLesao: v.nivelLesao || undefined,
      diagnosticoFuncional: v.diagnosticoFuncional,
      regimeCil: v.regimeCil,
      insumoAtual: v.insumoAtual,
      fornecedorAtual: v.fornecedorAtual || undefined,

      riscoEsvaziamento: !!v.riscoEsvaziamento,
      riscoItuAtual: !!v.riscoItuAtual,
      riscoAntibioticoterapia: !!v.riscoAntibioticoterapia,
      riscoTratoSuperior: !!v.riscoTratoSuperior,
      riscoInsuficienciaRenal: !!v.riscoInsuficienciaRenal,
      riscoLesaoUretral: !!v.riscoLesaoUretral,
      riscoPerdasNoturnas: !!v.riscoPerdasNoturnas,

      deficienciaLubrificacao: !!v.deficienciaLubrificacao,
      deficienciaPontaProtetora: !!v.deficienciaPontaProtetora,
      deficienciaMangaProtetora: !!v.deficienciaMangaProtetora,
      deficienciaDor: !!v.deficienciaDor,
      deficienciaAlergiaLidocaina: !!v.deficienciaAlergiaLidocaina,
      deficienciaFrascoReutilizado: !!v.deficienciaFrascoReutilizado,
      deficienciaRiscoInternacao: !!v.deficienciaRiscoInternacao,

      prescricaoIncluirCodigoFabricante: !!v.prescricaoIncluirCodigoFabricante,
      prescricaoEmbalagemPocket: !!v.prescricaoEmbalagemPocket,
      prescricaoClausulaMarca: !!v.prescricaoClausulaMarca,
      prescricaoCateterExterno: !!v.prescricaoCateterExterno,
      prescricaoIncluirObjetivo: !!v.prescricaoIncluirObjetivo,
      prescricaoIncluirConclusao: !!v.prescricaoIncluirConclusao,
      cateterExterno: v.prescricaoCateterExterno ? {
        incluirDescricaoTecnica: !!v.cateterExterno_incluirDescricaoTecnica,
        incluirCodigoSiafisico: !!v.cateterExterno_incluirCodigoSiafisico,
      } : undefined,

      produtosSolicitados: produtos.filter((p) => v[`prod_${p.codigo}`]).map((p) => ({
        codigo: p.codigo, descricao: p.nome,
        quantidade: Number(v[`qty_${p.codigo}`] ?? 1) || 1,
        unidade: 'unidade', codigoSiafisico: p.codigoSiafisico,
      })),

      comparativoAnvisa: v.comparativoAnvisa || undefined,

      medicoNomeExibicao: v.medicoNomeExibicao || undefined,
      medicoEspecialidade: v.medicoEspecialidade || undefined,
      crmExibicao: v.crmExibicao || undefined,
      cidadeEmissao: v.cidadeEmissao || undefined,
    };
    // No PATCH (revisão) a API rejeita campos fora do UpdateLaudoMedicoDto
    // (forbidNonWhitelisted): pacienteId/avaliacaoIuId/clinicaId só entram na criação.
    return editando ? base : { ...base, pacienteId, avaliacaoIuId, clinicaId };
  }

  const enviar = (acao: 'salvar' | 'encaminhar' | 'assinar') =>
    handleSubmit((v) => mut.mutate({ payload: montarPayload(v), acao }))();

  const produtoCheckbox = (p: Produto) => (
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
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {editando ? 'Revisar' : 'Novo'} Relatório Médico Judiciário
            {laudo && (
              <Badge variant={laudo.status === StatusLaudoMedico.ASSINADO ? 'success' : laudo.status === StatusLaudoMedico.AGUARDANDO_REVISAO ? 'secondary' : 'warning'}>
                {laudo.status === StatusLaudoMedico.ASSINADO ? 'Assinado' : laudo.status === StatusLaudoMedico.AGUARDANDO_REVISAO ? 'Aguardando revisão' : 'Rascunho'}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
          {avaliacaoIuId && (
            <Button type="button" variant="outline" size="sm" disabled={iaMut.isPending} onClick={() => iaMut.mutate()}>
              <Sparkles className="mr-2 h-4 w-4" /> {iaMut.isPending ? 'Pré-preenchendo…' : 'Pré-preencher com IA'}
            </Button>
          )}

          <div className="space-y-1">
            <Label>Data do relatório</Label>
            <Input type="date" className="max-w-[200px]" {...register('dataLaudo', { required: true })} />
          </div>

          {/* Etiologia e diagnóstico */}
          <div className="space-y-3 border-t border-border pt-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Etiologia e diagnóstico</p>
            <div className="space-y-1">
              <Label>Causa primária (etiologia)</Label>
              <Textarea rows={2} placeholder="Ex.: trauma raquimedular com lesão medular irreversível decorrente de acidente automobilístico" {...register('etiologia', { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>Nível da lesão medular (se aplicável)</Label>
              <Input placeholder="Ex.: em terceira e quarta vértebras cervicais (C3–C4)" {...register('nivelLesao')} />
            </div>
            <div className="space-y-1">
              <Label>Diagnóstico funcional</Label>
              <Textarea rows={2} placeholder="Ex.: Disfunção Neurogênica do Trato Urinário Inferior (DNTUI — CID N31), com bexiga neurogênica secundária" {...register('diagnosticoFuncional', { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>CIDs adicionais</Label>
              <Input placeholder="G82.2, N31.2" {...register('cid10')} />
            </div>
            <div className="space-y-1">
              <Label>Contexto social/laboral</Label>
              <Input placeholder="Ex.: vida social ativa e exerce atividade laboral" {...register('contextoSocial')} />
            </div>
          </div>

          {/* Quadro clínico e riscos */}
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Quadro clínico e riscos</p>
            <CheckboxField id="riscoEsvaziamento" label="Impedimento do esvaziamento espontâneo da bexiga, com alto volume residual miccional" watch={watch} setValue={setValue} />
            <CheckboxField id="riscoItuAtual" label="Paciente já apresenta ITU de repetição decorrente do procedimento atual" watch={watch} setValue={setValue} />
            <CheckboxField id="riscoAntibioticoterapia" label="Necessidade de antibioticoterapia para tratamento das infecções" watch={watch} setValue={setValue} />
            <CheckboxField id="riscoTratoSuperior" label="Risco de deterioração do trato urinário superior" watch={watch} setValue={setValue} />
            <CheckboxField id="riscoInsuficienciaRenal" label="Risco de insuficiência renal" watch={watch} setValue={setValue} />
            <CheckboxField id="riscoLesaoUretral" label="Risco de lesão uretral / trauma de conduto" watch={watch} setValue={setValue} />
            <CheckboxField id="riscoPerdasNoturnas" label="Perdas urinárias inesperadas e constantes durante a noite (fundamenta cateter externo)" watch={watch} setValue={setValue} />
            <div className="space-y-1 pt-1">
              <Label>Regime de cateterismo (CIL)</Label>
              <Input placeholder="Ex.: a cada 4 (quatro) horas, totalizando 6 (seis) cateterismos ao dia" {...register('regimeCil', { required: true })} />
            </div>
          </div>

          {/* Insumo atual e deficiências */}
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Insumo atualmente fornecido e suas deficiências</p>
            <div className="space-y-1">
              <Label>Cateter em uso atualmente</Label>
              <Textarea rows={2} placeholder="Ex.: cateter convencional (sonda uretral), sem lubrificação ou proteção" {...register('insumoAtual', { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>Fornecedor do insumo atual</Label>
              <Input placeholder="Ex.: pelo SUS" {...register('fornecedorAtual')} />
            </div>
            <div className="pt-1 space-y-0.5">
              <CheckboxField id="deficienciaLubrificacao" label="Ausência de lubrificação homogênea em toda a extensão — provoca traumas e sangramentos" watch={watch} setValue={setValue} />
              <CheckboxField id="deficienciaPontaProtetora" label="Ausência de ponta protetora — expõe o cateter às bactérias da uretra distal/pele" watch={watch} setValue={setValue} />
              <CheckboxField id="deficienciaMangaProtetora" label="Ausência de manga protetora — permite contato direto com mãos e ambiente" watch={watch} setValue={setValue} />
              <CheckboxField id="deficienciaDor" label="Dor durante o procedimento por rigidez do material, dificultando a inserção" watch={watch} setValue={setValue} />
              <CheckboxField id="deficienciaAlergiaLidocaina" label="Reação alérgica importante à lidocaína (lubrificante recomendado), exigindo adjuvante alternativo" watch={watch} setValue={setValue} />
              <CheckboxField id="deficienciaFrascoReutilizado" label="Uso repetido do mesmo frasco de lubrificante ao longo do mês — vetor adicional de contaminação" watch={watch} setValue={setValue} />
              <CheckboxField id="deficienciaRiscoInternacao" label="Histórico/risco aumentado de internação hospitalar decorrente das infecções" watch={watch} setValue={setValue} />
            </div>
          </div>

          {/* Prescrição indicada */}
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Prescrição indicada</p>
            <div className="space-y-2">
              {produtosVapro.map(produtoCheckbox)}
              {produtosOutros.map(produtoCheckbox)}
            </div>
            <div className="pt-1 space-y-0.5">
              <CheckboxField id="prescricaoIncluirCodigoFabricante" label="Citar código do fabricante e apresentação na referência comercial" watch={watch} setValue={setValue} />
              <CheckboxField id="prescricaoEmbalagemPocket" label="Embalagem pocket (transporte e manuseio facilitados; justificada pelo contexto social)" watch={watch} setValue={setValue} />
              <CheckboxField id="prescricaoClausulaMarca" label="Incluir cláusula de independência de marca com referência comercial" watch={watch} setValue={setValue} />
              <CheckboxField id="prescricaoCateterExterno" label="Prescrever também cateter externo masculino (habilite perdas noturnas no quadro clínico acima)" watch={watch} setValue={setValue} />
            </div>
            {prescricaoCateterExterno && (
              <div className="pl-4 border-l-2 border-border space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Tamanho do cateter externo</p>
                <div className="space-y-2">{produtosExterno.map(produtoCheckbox)}</div>
                <CheckboxField id="cateterExterno_incluirDescricaoTecnica" label="Usar descritivo técnico completo na prescrição" watch={watch} setValue={setValue} />
                <CheckboxField id="cateterExterno_incluirCodigoSiafisico" label="Citar códigos SIAFISICO no documento" watch={watch} setValue={setValue} />
              </div>
            )}
            <div className="pt-1 space-y-0.5">
              <CheckboxField id="prescricaoIncluirObjetivo" label="Incluir cabeçalho de OBJETIVO (nexo causal + indispensabilidade do insumo)" watch={watch} setValue={setValue} />
              <CheckboxField id="prescricaoIncluirConclusao" label="Incluir CONCLUSÃO TÉCNICA (adequação técnica ≠ preferência de marca)" watch={watch} setValue={setValue} />
            </div>
          </div>

          {/* Comparativo técnico ANVISA */}
          <div className="space-y-1 border-t border-border pt-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Comparativo técnico ANVISA (opcional)</p>
            <Label>Cateter divergente oferecido pelo ente público</Label>
            <Select value={(watch('comparativoAnvisa') as string) || undefined} onValueChange={(v) => setValue('comparativoAnvisa', v)}>
              <SelectTrigger><SelectValue placeholder="— não incluir comparativo —" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="speedicath">SpeediCath (Coloplast) — reg. ANVISA 10430310037</SelectItem>
                <SelectItem value="gentlecath">GentleCath Glide (Convatec) — reg. ANVISA 80523020075</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Profissional e fecho */}
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
            <p className="col-span-2 text-xs font-semibold uppercase text-muted-foreground">Profissional e fecho</p>
            <div className="space-y-1">
              <Label>Nome do médico</Label>
              <Input placeholder="Dr(a). ..." {...register('medicoNomeExibicao')} />
            </div>
            <div className="space-y-1">
              <Label>CRM / UF</Label>
              <Input placeholder="Ex.: 157.749-SP" {...register('crmExibicao')} />
            </div>
            <div className="space-y-1">
              <Label>Especialidade</Label>
              <Input {...register('medicoEspecialidade')} />
            </div>
            <div className="space-y-1">
              <Label>Cidade/UF de emissão</Label>
              <Input placeholder="Ex.: São Paulo – SP" {...register('cidadeEmissao')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="button" variant="outline" disabled={mut.isPending} onClick={() => enviar('salvar')}>
              {mut.isPending ? 'Salvando...' : 'Salvar rascunho'}
            </Button>
            {podeAssinar ? (
              <Button type="button" disabled={mut.isPending} onClick={() => enviar('assinar')}>
                {mut.isPending ? 'Salvando...' : 'Salvar e assinar'}
              </Button>
            ) : (
              <Button type="button" disabled={mut.isPending} onClick={() => enviar('encaminhar')}>
                {mut.isPending ? 'Salvando...' : 'Salvar e encaminhar para revisão'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
