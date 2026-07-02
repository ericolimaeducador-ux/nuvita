import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { PenLine, Scale, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { prontuariosApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/auth/AuthContext';
import {
  TipoAtendimento, TIPO_ATENDIMENTO_LABEL,
  LocalAtendimento, LOCAL_LABEL, PerfilCliente, PERFIL_LABEL, Destreza, DESTREZA_LABEL,
  TipoIU, TIPO_IU_LABEL, EncaminhamentoIU, ENCAMINHAMENTO_LABEL,
  type Prontuario, type FichaVaPro,
  type ProntuarioSubjetivo, type ProntuarioObjetivo, type ExameSegmentar, type SinaisVitais,
  type ProntuarioAvaliacao, type ProntuarioPlano,
  type RelatorioJudicial, type NaturezaAtendimento, type TipoSolicitacaoJudicial,
} from '@/types';

const NATUREZA_LABEL: Record<NaturezaAtendimento, string> = {
  sus: 'Saúde Pública (SUS)',
  suplementar: 'Saúde Suplementar',
  particular: 'Particular',
};

const TIPO_SOLICITACAO_LABEL: Record<TipoSolicitacaoJudicial, string> = {
  medicamento: 'Medicamento',
  produto: 'Produto / Insumo',
  procedimento: 'Procedimento',
};

const EXAME_SEGMENTAR_CAMPOS: { key: keyof ExameSegmentar; label: string }[] = [
  { key: 'cabecaPescoco', label: 'Cabeça e pescoço' },
  { key: 'cardiovascular', label: 'Cardiovascular' },
  { key: 'respiratorio', label: 'Respiratório' },
  { key: 'abdome', label: 'Abdome' },
  { key: 'geniturinario', label: 'Geniturinário' },
  { key: 'neurologico', label: 'Neurológico' },
  { key: 'extremidades', label: 'Extremidades' },
  { key: 'pele', label: 'Pele e mucosas' },
];

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground mt-0.5 whitespace-pre-line">{children || '—'}</p>
    </div>
  );
}

/** Só renderiza o Campo se houver valor — evita poluir a visualização. */
function CampoSe({ label, children }: { label: string; children?: React.ReactNode }) {
  if (children === undefined || children === null || children === '' ||
      (Array.isArray(children) && children.length === 0)) return null;
  return <Campo label={label}>{children}</Campo>;
}

function SecaoSOAP({ letra, titulo, children }: { letra: string; titulo: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">{letra} — {titulo}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function simNao(v?: boolean): string {
  return v === undefined ? '' : v ? 'Sim' : 'Não';
}

/** Visualização (somente leitura) de um prontuário SOAP, com ação de assinar rascunho. */
export function ProntuarioDetailDialog({
  prontuarioId,
  pacienteId,
  open,
  onOpenChange,
}: {
  prontuarioId: string | null;
  pacienteId?: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ['prontuario', prontuarioId],
    queryFn: () => prontuariosApi.get(prontuarioId!),
    enabled: !!prontuarioId && open,
  });
  const assinarMut = useMutation({
    mutationFn: () => prontuariosApi.assinar(prontuarioId!),
    onSuccess: () => {
      toast.success('Prontuário assinado.');
      void qc.invalidateQueries({ queryKey: ['prontuario', prontuarioId] });
      void qc.invalidateQueries({ queryKey: ['prontuarios'] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  const pr = q.data as Prontuario | undefined;
  const sv = pr?.objetivo?.sinaisVitais;
  const sinais = sv
    ? [
        sv.pressaoArterial && `PA ${sv.pressaoArterial}`,
        sv.frequenciaCardiaca && `FC ${sv.frequenciaCardiaca} bpm`,
        sv.frequenciaRespiratoria && `FR ${sv.frequenciaRespiratoria} irpm`,
        sv.temperatura && `Tax ${sv.temperatura} °C`,
        sv.saturacaoO2 && `SatO₂ ${sv.saturacaoO2}%`,
        sv.peso && `Peso ${sv.peso} kg`,
        sv.altura && `Altura ${sv.altura} cm`,
        sv.escalaDor !== undefined && `Dor ${sv.escalaDor}/10`,
      ].filter(Boolean).join('  ·  ')
    : '';
  const seg = pr?.objetivo?.exameSegmentar;
  const rj = pr?.relatorioJudicial;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Prontuário
            {pr && <Badge variant={pr.assinado ? 'success' : 'warning'}>{pr.assinado ? 'Assinado' : 'Rascunho'}</Badge>}
          </DialogTitle>
        </DialogHeader>

        {q.isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : !pr ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Não foi possível carregar o prontuário.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 glass rounded-xl p-4">
              <Campo label="Data do atendimento">{pr.dataAtendimento ? dayjs(pr.dataAtendimento).format('DD/MM/YYYY HH:mm') : '—'}</Campo>
              <Campo label="Tipo">{TIPO_ATENDIMENTO_LABEL[pr.tipo] ?? pr.tipo}</Campo>
              {pr.assinado?.dataAssinatura && (
                <Campo label="Assinado em">{dayjs(pr.assinado.dataAssinatura).format('DD/MM/YYYY HH:mm')}</Campo>
              )}
            </div>

            <SecaoSOAP letra="S" titulo="Subjetivo / Anamnese">
              <Campo label="Queixa principal">{pr.subjetivo?.queixaPrincipal}</Campo>
              <CampoSe label="História da doença atual">{pr.subjetivo?.hda}</CampoSe>
              <CampoSe label="Antecedentes pessoais">{pr.subjetivo?.antecedentesPessoais}</CampoSe>
              <CampoSe label="Antecedentes cirúrgicos">{pr.subjetivo?.antecedentesCirurgicos}</CampoSe>
              <CampoSe label="Medicamentos em uso">{pr.subjetivo?.medicamentosEmUso}</CampoSe>
              <CampoSe label="Alergias">{pr.subjetivo?.alergias}</CampoSe>
              <CampoSe label="História familiar">{pr.subjetivo?.historiaFamiliar}</CampoSe>
              <CampoSe label="História social">{pr.subjetivo?.historiaSocial}</CampoSe>
              <CampoSe label="Revisão de sistemas">{pr.subjetivo?.revisaoSistemas}</CampoSe>
            </SecaoSOAP>

            <SecaoSOAP letra="O" titulo="Objetivo / Exame físico">
              <CampoSe label="Estado geral">{pr.objetivo?.estadoGeral}</CampoSe>
              <CampoSe label="Sinais vitais">{sinais}</CampoSe>
              {seg && Object.values(seg).some(Boolean) && (
                <div className="grid grid-cols-2 gap-3">
                  {EXAME_SEGMENTAR_CAMPOS.map(({ key, label }) => (
                    <CampoSe key={key} label={label}>{seg[key]}</CampoSe>
                  ))}
                </div>
              )}
              <CampoSe label="Outros achados">{pr.objetivo?.exameFisico}</CampoSe>
            </SecaoSOAP>

            <SecaoSOAP letra="A" titulo="Avaliação">
              <CampoSe label="Hipóteses diagnósticas">{pr.avaliacao?.hipotesesDiagnosticas?.join(', ')}</CampoSe>
              <CampoSe label="CID-10">{pr.avaliacao?.cid10?.join(', ')}</CampoSe>
              <CampoSe label="Diagnóstico definitivo">{pr.avaliacao?.diagnosticoDefinitivo}</CampoSe>
              <CampoSe label="Evolução">{pr.avaliacao?.evolucao}</CampoSe>
            </SecaoSOAP>

            <SecaoSOAP letra="P" titulo="Plano">
              <CampoSe label="Conduta">{pr.plano?.conduta}</CampoSe>
              <CampoSe label="Prescrição">{pr.plano?.prescricao}</CampoSe>
              <CampoSe label="Exames solicitados">{pr.plano?.examesSolicitados?.join(', ')}</CampoSe>
              <CampoSe label="Orientações">{pr.plano?.orientacoes}</CampoSe>
              <CampoSe label="Encaminhamentos">{pr.plano?.encaminhamentos}</CampoSe>
              <CampoSe label="Retorno">{pr.plano?.retorno}</CampoSe>
            </SecaoSOAP>

            {rj && (
              <div className="glass rounded-xl p-4 border border-amber-500/20">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Scale className="h-3.5 w-3.5" /> Judicialização — NAT-JUS
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <CampoSe label="Município/Estado">{rj.municipioEstado}</CampoSe>
                  <CampoSe label="Natureza do atendimento">{rj.naturezaAtendimento && NATUREZA_LABEL[rj.naturezaAtendimento]}</CampoSe>
                  <CampoSe label="Data de emissão">{rj.dataEmissao && dayjs(rj.dataEmissao).format('DD/MM/YYYY')}</CampoSe>
                  <CampoSe label="Tipo de solicitação">{rj.tipoSolicitacao && TIPO_SOLICITACAO_LABEL[rj.tipoSolicitacao]}</CampoSe>
                </div>
                <div className="mt-3 space-y-3">
                  <CampoSe label="Enfermidade / CID">{rj.enfermidadeCid}</CampoSe>
                  <CampoSe label="Histórico da doença">{rj.historicoDoenca}</CampoSe>
                  <CampoSe label="Tratamentos realizados / resultado">{rj.tratamentosRealizados}</CampoSe>
                  {rj.produto && (
                    <CampoSe label="Produto solicitado">
                      {[rj.produto.descricao,
                        rj.produto.calibreFrench && `calibre ${rj.produto.calibreFrench} Fr`,
                        rj.produto.comprimentoCm && `${rj.produto.comprimentoCm} cm`,
                        rj.produto.quantidadePorDia && `${rj.produto.quantidadePorDia}/dia`,
                        rj.produto.quantidadePorMes && `${rj.produto.quantidadePorMes}/mês`,
                        rj.produto.usoContinuo && 'uso contínuo',
                      ].filter(Boolean).join(' · ')}
                    </CampoSe>
                  )}
                  {rj.medicamento && (
                    <CampoSe label="Medicamento solicitado">
                      {[rj.medicamento.principioAtivo, rj.medicamento.formaFarmaceuticaApresentacao,
                        rj.medicamento.dose, rj.medicamento.posologia, rj.medicamento.viaAdministracao,
                        rj.medicamento.duracaoTratamento].filter(Boolean).join(' · ')}
                    </CampoSe>
                  )}
                  <CampoSe label="Procedimento">{rj.procedimentoDescricao}</CampoSe>
                  <CampoSe label="Urgente">{rj.urgente !== undefined && `${simNao(rj.urgente)}${rj.justificativaUrgencia ? ` — ${rj.justificativaUrgencia}` : ''}`}</CampoSe>
                  <CampoSe label="Imprescindível">{rj.imprescindivel !== undefined && `${simNao(rj.imprescindivel)}${rj.justificativaImprescindivel ? ` — ${rj.justificativaImprescindivel}` : ''}`}</CampoSe>
                  <CampoSe label="Benefícios esperados">{rj.beneficiosEsperados}</CampoSe>
                  <CampoSe label="Consequências da não utilização">{rj.consequenciasNaoUso}</CampoSe>
                  <CampoSe label="Prescritor">{rj.prescritor && [rj.prescritor.nome, rj.prescritor.registro, rj.prescritor.especialidade].filter(Boolean).join(' · ')}</CampoSe>
                </div>
              </div>
            )}

            {pr.fichaVaPro && (
              <div className="glass rounded-xl p-4 border border-primary/20">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                  Ficha VaPro (Hollister) — Avaliação de IU
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Local">{pr.fichaVaPro.local ? LOCAL_LABEL[pr.fichaVaPro.local as LocalAtendimento] : ''}</Campo>
                  <Campo label="Início dos sintomas">{pr.fichaVaPro.inicioSintomas}</Campo>
                  <Campo label="Motivo da IU">{pr.fichaVaPro.motivoIU}</Campo>
                  <Campo label="Perfil do cliente">{pr.fichaVaPro.perfilCliente ? PERFIL_LABEL[pr.fichaVaPro.perfilCliente as PerfilCliente] : ''}</Campo>
                  <Campo label="Destreza">{pr.fichaVaPro.destreza ? DESTREZA_LABEL[pr.fichaVaPro.destreza as Destreza] : ''}</Campo>
                  <Campo label="DNTUI">{simNao(pr.fichaVaPro.dntui)}</Campo>
                  <Campo label="Tipos de IU">{(pr.fichaVaPro.tiposIU ?? []).map((t) => TIPO_IU_LABEL[t as TipoIU] ?? t).join(', ')}</Campo>
                  <Campo label="Micção espontânea">{simNao(pr.fichaVaPro.miccaoEspontanea)}</Campo>
                  <Campo label="Realiza cateterismo">{simNao(pr.fichaVaPro.realizaCateterismo)}</Campo>
                  <Campo label="Cateterismos/dia">{pr.fichaVaPro.cateterismosDia}</Campo>
                  <Campo label="Cateter utilizado">{pr.fichaVaPro.cateterUtilizado}</Campo>
                  <Campo label="Última ITU">{pr.fichaVaPro.ultimaInfeccaoUrinaria}</Campo>
                  <Campo label="Em tratamento">{simNao(pr.fichaVaPro.emTratamento)}</Campo>
                  <Campo label="Tratamento">{pr.fichaVaPro.tratamento}</Campo>
                  <Campo label="Volume drenado">{pr.fichaVaPro.volumeDrenado}</Campo>
                  <Campo label="Cateter VaPro indicado">{pr.fichaVaPro.cateterVaProIndicado ? `${pr.fichaVaPro.cateterVaProIndicado.sexo ?? ''} ${pr.fichaVaPro.cateterVaProIndicado.french ?? ''}Fr`.trim() : ''}</Campo>
                  <Campo label="Encaminhamento">{pr.fichaVaPro.encaminhamento ? ENCAMINHAMENTO_LABEL[pr.fichaVaPro.encaminhamento as EncaminhamentoIU] : ''}</Campo>
                  <Campo label="Responsável pelo cateterismo">{pr.fichaVaPro.responsavelCateterismo}</Campo>
                  <Campo label="COREN">{pr.fichaVaPro.coren}</Campo>
                </div>
                <div className="mt-3">
                  <Campo label="Outras intercorrências / medicamentos">{pr.fichaVaPro.outrasIntercorrencias}</Campo>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {pr?.relatorioJudicial && pacienteId && (
            <Button variant="outline" onClick={() => navigate(`/pacientes/${pacienteId}/prontuario/${pr.id}/natjus/imprimir`)}>
              <FileText className="mr-2 h-4 w-4" /> Gerar relatório NAT-JUS
            </Button>
          )}
          {pr && !pr.assinado && (
            <Button variant="outline" disabled={assinarMut.isPending} onClick={() => assinarMut.mutate()}>
              <PenLine className="mr-2 h-4 w-4" /> {assinarMut.isPending ? 'Assinando...' : 'Assinar prontuário'}
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Formulário de novo atendimento ---------------------------------------

function TextField({ label, value, onChange, rows = 2, placeholder }: {
  label: string; value?: string; onChange: (v: string) => void; rows?: number; placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Textarea rows={rows} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** Abre um novo atendimento (ficha SOAP em branco) já vinculado a um paciente. */
export function NovoAtendimentoDialog({
  pacienteId,
  pacienteNome,
  vaProDefault = false,
  open,
  onOpenChange,
}: {
  pacienteId: string;
  pacienteNome?: string;
  vaProDefault?: boolean;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [data, setData] = useState(dayjs().format('YYYY-MM-DDTHH:mm'));
  const [tipo, setTipo] = useState<TipoAtendimento>(TipoAtendimento.CONSULTA);

  const [subjetivo, setSubjetivo] = useState<ProntuarioSubjetivo>({});
  const [sinais, setSinais] = useState<SinaisVitais>({});
  const [estadoGeral, setEstadoGeral] = useState('');
  const [seg, setSeg] = useState<ExameSegmentar>({});
  const [exameOutros, setExameOutros] = useState('');
  const [avaliacao, setAvaliacao] = useState<ProntuarioAvaliacao>({});
  const [plano, setPlano] = useState<ProntuarioPlano>({});

  const [cidSearch, setCidSearch] = useState('');
  const [cidSelected, setCidSelected] = useState<string[]>([]);
  const [cidOpts, setCidOpts] = useState<{ value: string; label: string }[]>([]);

  // Ficha VaPro / Hollister (questionário de IU amarrado ao prontuário)
  const [incluirFicha, setIncluirFicha] = useState(vaProDefault);
  const [ficha, setFicha] = useState<FichaVaPro>({});
  const setF = (patch: Partial<FichaVaPro>) => setFicha((f) => ({ ...f, ...patch }));
  const toggleTipoIU = (t: TipoIU) =>
    setFicha((f) => {
      const cur = f.tiposIU ?? [];
      return { ...f, tiposIU: cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t] };
    });

  // Judicialização / NAT-JUS
  const [incluirJudicial, setIncluirJudicial] = useState(false);
  const [judicial, setJudicial] = useState<RelatorioJudicial>({});
  const setJ = (patch: Partial<RelatorioJudicial>) => setJudicial((j) => ({ ...j, ...patch }));

  const setS = (patch: Partial<ProntuarioSubjetivo>) => setSubjetivo((s) => ({ ...s, ...patch }));
  const setSV = (patch: Partial<SinaisVitais>) => setSinais((s) => ({ ...s, ...patch }));
  const setSeg2 = (patch: Partial<ExameSegmentar>) => setSeg((s) => ({ ...s, ...patch }));
  const setA = (patch: Partial<ProntuarioAvaliacao>) => setAvaliacao((a) => ({ ...a, ...patch }));
  const setP = (patch: Partial<ProntuarioPlano>) => setPlano((p) => ({ ...p, ...patch }));
  const num = (v: string): number | undefined => (v ? Number(v) : undefined);

  function reset() {
    setData(dayjs().format('YYYY-MM-DDTHH:mm')); setTipo(TipoAtendimento.CONSULTA);
    setSubjetivo({}); setSinais({}); setEstadoGeral(''); setSeg({}); setExameOutros('');
    setAvaliacao({}); setPlano({});
    setCidSearch(''); setCidSelected([]); setCidOpts([]);
    setIncluirFicha(vaProDefault); setFicha({});
    setIncluirJudicial(false); setJudicial({});
  }

  async function buscarCid(qstr: string) {
    setCidSearch(qstr);
    if (!qstr || qstr.length < 2) return setCidOpts([]);
    try {
      const r = await prontuariosApi.cid10(qstr);
      setCidOpts((r ?? []).map((c) => ({ value: c.codigo, label: `${c.codigo} — ${c.descricao}` })));
    } catch { setCidOpts([]); }
  }

  const createMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => prontuariosApi.create(payload),
    onSuccess: () => {
      toast.success('Atendimento registrado.');
      reset();
      onOpenChange(false);
      void qc.invalidateQueries({ queryKey: ['prontuarios'] });
    },
    onError: (e) => toast.error('Erro', apiErrorMessage(e)),
  });

  function clean<T extends object>(obj: T): T | undefined {
    const entries = Object.entries(obj).filter(([, v]) =>
      v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0));
    return entries.length ? (Object.fromEntries(entries) as T) : undefined;
  }

  function submit() {
    if (!subjetivo.queixaPrincipal) { toast.error('Informe ao menos a queixa principal.'); return; }
    const objetivo: ProntuarioObjetivo = {
      estadoGeral: estadoGeral || undefined,
      sinaisVitais: clean(sinais),
      exameSegmentar: clean(seg),
      exameFisico: exameOutros || undefined,
    };
    createMut.mutate({
      clinicaId: user?.clinicaId,
      pacienteId,
      dataAtendimento: dayjs(data).toISOString(),
      tipo,
      subjetivo: { ...subjetivo, queixaPrincipal: subjetivo.queixaPrincipal },
      objetivo: clean(objetivo) ?? {},
      avaliacao: { ...clean(avaliacao), cid10: cidSelected.length ? cidSelected : undefined } ,
      plano: clean(plano) ?? {},
      fichaVaPro: incluirFicha ? clean(ficha) : undefined,
      relatorioJudicial: incluirJudicial
        ? clean({
            ...judicial,
            produto: clean(judicial.produto ?? {}),
            medicamento: clean(judicial.medicamento ?? {}),
            prescritor: clean(judicial.prescritor ?? {}),
            dataEmissao: judicial.dataEmissao || undefined,
          })
        : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo atendimento{pacienteNome ? ` — ${pacienteNome}` : ''}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="naData">Data do atendimento</Label>
              <Input id="naData" type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de atendimento</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAtendimento)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.values(TipoAtendimento).map((t) => <SelectItem key={t} value={t}>{TIPO_ATENDIMENTO_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">S — Subjetivo / Anamnese</p>
          <div className="space-y-2">
            <Label htmlFor="naQueixa">Queixa principal *</Label>
            <Textarea id="naQueixa" rows={2} value={subjetivo.queixaPrincipal ?? ''} onChange={(e) => setS({ queixaPrincipal: e.target.value })} />
          </div>
          <TextField label="História da doença atual (HDA)" value={subjetivo.hda} onChange={(v) => setS({ hda: v })} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Antecedentes pessoais / comorbidades" value={subjetivo.antecedentesPessoais} onChange={(v) => setS({ antecedentesPessoais: v })} />
            <TextField label="Antecedentes cirúrgicos" value={subjetivo.antecedentesCirurgicos} onChange={(v) => setS({ antecedentesCirurgicos: v })} />
            <TextField label="Medicamentos em uso" value={subjetivo.medicamentosEmUso} onChange={(v) => setS({ medicamentosEmUso: v })} />
            <TextField label="Alergias" value={subjetivo.alergias} onChange={(v) => setS({ alergias: v })} />
            <TextField label="História familiar" value={subjetivo.historiaFamiliar} onChange={(v) => setS({ historiaFamiliar: v })} />
            <TextField label="História social (tabagismo, etilismo, ocupação)" value={subjetivo.historiaSocial} onChange={(v) => setS({ historiaSocial: v })} />
          </div>
          <TextField label="Revisão de sistemas" value={subjetivo.revisaoSistemas} onChange={(v) => setS({ revisaoSistemas: v })} />

          <Separator />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">O — Objetivo / Exame físico</p>
          <TextField label="Estado geral" value={estadoGeral} onChange={setEstadoGeral} rows={2} placeholder="BEG, LOTE, hidratado, corado, afebril…" />
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-2"><Label>PA</Label><Input placeholder="120/80" value={sinais.pressaoArterial ?? ''} onChange={(e) => setSV({ pressaoArterial: e.target.value })} /></div>
            <div className="space-y-2"><Label>FC (bpm)</Label><Input inputMode="numeric" value={sinais.frequenciaCardiaca ?? ''} onChange={(e) => setSV({ frequenciaCardiaca: num(e.target.value) })} /></div>
            <div className="space-y-2"><Label>FR (irpm)</Label><Input inputMode="numeric" value={sinais.frequenciaRespiratoria ?? ''} onChange={(e) => setSV({ frequenciaRespiratoria: num(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Tax (°C)</Label><Input inputMode="decimal" value={sinais.temperatura ?? ''} onChange={(e) => setSV({ temperatura: num(e.target.value) })} /></div>
            <div className="space-y-2"><Label>SatO₂ (%)</Label><Input inputMode="numeric" value={sinais.saturacaoO2 ?? ''} onChange={(e) => setSV({ saturacaoO2: num(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Peso (kg)</Label><Input inputMode="decimal" value={sinais.peso ?? ''} onChange={(e) => setSV({ peso: num(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Altura (cm)</Label><Input inputMode="numeric" value={sinais.altura ?? ''} onChange={(e) => setSV({ altura: num(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Dor (0–10)</Label><Input inputMode="numeric" value={sinais.escalaDor ?? ''} onChange={(e) => setSV({ escalaDor: num(e.target.value) })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {EXAME_SEGMENTAR_CAMPOS.map(({ key, label }) => (
              <TextField key={key} label={label} value={seg[key]} onChange={(v) => setSeg2({ [key]: v })} />
            ))}
          </div>
          <TextField label="Outros achados" value={exameOutros} onChange={setExameOutros} />

          <Separator />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">A — Avaliação</p>
          <TextField label="Hipótese diagnóstica" value={avaliacao.hipotesesDiagnosticas?.join('\n')} onChange={(v) => setA({ hipotesesDiagnosticas: v ? v.split('\n').map((s) => s.trim()).filter(Boolean) : undefined })} placeholder="Uma por linha" />
          <div className="space-y-2">
            <Label htmlFor="naCid">CID-10 {cidSelected.length > 0 && <span className="text-primary">({cidSelected.join(', ')})</span>}</Label>
            <Input id="naCid" placeholder="Digite para buscar (ex.: N31)" value={cidSearch} onChange={(e) => buscarCid(e.target.value)} />
            {cidOpts.length > 0 && (
              <div className="glass rounded-lg p-1 space-y-0.5 max-h-40 overflow-y-auto">
                {cidOpts.map((o) => (
                  <button key={o.value} type="button"
                    className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-white/5 text-foreground"
                    onClick={() => { setCidSelected((cur) => cur.includes(o.value) ? cur : [...cur, o.value]); setCidSearch(''); setCidOpts([]); }}>
                    {o.label}
                  </button>
                ))}
              </div>
            )}
            {cidSelected.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {cidSelected.map((c) => (
                  <Badge key={c} variant="secondary" className="cursor-pointer" onClick={() => setCidSelected((cur) => cur.filter((x) => x !== c))}>
                    {c} ✕
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <TextField label="Diagnóstico definitivo" value={avaliacao.diagnosticoDefinitivo} onChange={(v) => setA({ diagnosticoDefinitivo: v })} />
          <TextField label="Evolução" value={avaliacao.evolucao} onChange={(v) => setA({ evolucao: v })} />

          <Separator />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">P — Plano</p>
          <TextField label="Conduta" value={plano.conduta} onChange={(v) => setP({ conduta: v })} />
          <TextField label="Prescrição" value={plano.prescricao} onChange={(v) => setP({ prescricao: v })} />
          <TextField label="Exames solicitados" value={plano.examesSolicitados?.join('\n')} onChange={(v) => setP({ examesSolicitados: v ? v.split('\n').map((s) => s.trim()).filter(Boolean) : undefined })} placeholder="Um por linha" />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Orientações" value={plano.orientacoes} onChange={(v) => setP({ orientacoes: v })} />
            <TextField label="Encaminhamentos" value={plano.encaminhamentos} onChange={(v) => setP({ encaminhamentos: v })} />
          </div>
          <div className="space-y-2"><Label>Retorno</Label><Input value={plano.retorno ?? ''} placeholder="Ex.: 30 dias / conforme necessidade" onChange={(e) => setP({ retorno: e.target.value })} /></div>

          {/* --- Judicialização / NAT-JUS --- */}
          <Separator />
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={incluirJudicial} onCheckedChange={(c) => setIncluirJudicial(!!c)} />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Scale className="h-3.5 w-3.5" /> Judicialização — Relatório NAT-JUS
            </span>
          </label>

          {incluirJudicial && (
            <div className="space-y-4 glass rounded-xl p-4 border border-amber-500/20">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Município/Estado</Label><Input value={judicial.municipioEstado ?? ''} placeholder="São Paulo/SP" onChange={(e) => setJ({ municipioEstado: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Natureza do atendimento</Label>
                  <Select value={judicial.naturezaAtendimento ?? undefined} onValueChange={(v) => setJ({ naturezaAtendimento: v as NaturezaAtendimento })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{(Object.keys(NATUREZA_LABEL) as NaturezaAtendimento[]).map((n) => <SelectItem key={n} value={n}>{NATUREZA_LABEL[n]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Data de emissão</Label><Input type="date" value={judicial.dataEmissao ? dayjs(judicial.dataEmissao).format('YYYY-MM-DD') : ''} onChange={(e) => setJ({ dataEmissao: e.target.value ? dayjs(e.target.value).toISOString() : undefined })} /></div>
              </div>
              <TextField label="Enfermidade / CID (principal e causa de base)" value={judicial.enfermidadeCid} onChange={(v) => setJ({ enfermidadeCid: v })} />
              <TextField label="Histórico da doença" value={judicial.historicoDoenca} onChange={(v) => setJ({ historicoDoenca: v })} rows={3} />
              <TextField label="Tratamentos já realizados / resultado" value={judicial.tratamentosRealizados} onChange={(v) => setJ({ tratamentosRealizados: v })} rows={3} />

              <div className="space-y-2">
                <Label>Tipo de solicitação</Label>
                <Select value={judicial.tipoSolicitacao ?? undefined} onValueChange={(v) => setJ({ tipoSolicitacao: v as TipoSolicitacaoJudicial })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{(Object.keys(TIPO_SOLICITACAO_LABEL) as TipoSolicitacaoJudicial[]).map((t) => <SelectItem key={t} value={t}>{TIPO_SOLICITACAO_LABEL[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {judicial.tipoSolicitacao === 'produto' && (
                <div className="space-y-3 border-l-2 border-amber-500/20 pl-3">
                  <TextField label="Descrição do produto" value={judicial.produto?.descricao} onChange={(v) => setJ({ produto: { ...judicial.produto, descricao: v } })} placeholder="Ex.: Cateter hidrofílico VaPro, pronto para uso, com ponta protetora" />
                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-2"><Label>Calibre (Fr)</Label><Input inputMode="numeric" value={judicial.produto?.calibreFrench ?? ''} onChange={(e) => setJ({ produto: { ...judicial.produto, calibreFrench: num(e.target.value) } })} /></div>
                    <div className="space-y-2"><Label>Compr. (cm)</Label><Input inputMode="numeric" value={judicial.produto?.comprimentoCm ?? ''} onChange={(e) => setJ({ produto: { ...judicial.produto, comprimentoCm: num(e.target.value) } })} /></div>
                    <div className="space-y-2"><Label>Qtd/dia</Label><Input inputMode="numeric" value={judicial.produto?.quantidadePorDia ?? ''} onChange={(e) => setJ({ produto: { ...judicial.produto, quantidadePorDia: num(e.target.value) } })} /></div>
                    <div className="space-y-2"><Label>Qtd/mês</Label><Input inputMode="numeric" value={judicial.produto?.quantidadePorMes ?? ''} onChange={(e) => setJ({ produto: { ...judicial.produto, quantidadePorMes: num(e.target.value) } })} /></div>
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={!!judicial.produto?.usoContinuo} onCheckedChange={(c) => setJ({ produto: { ...judicial.produto, usoContinuo: !!c } })} /> Uso contínuo</label>
                </div>
              )}

              {judicial.tipoSolicitacao === 'medicamento' && (
                <div className="space-y-3 border-l-2 border-amber-500/20 pl-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Princípio ativo (DCB/DCI)</Label><Input value={judicial.medicamento?.principioAtivo ?? ''} onChange={(e) => setJ({ medicamento: { ...judicial.medicamento, principioAtivo: e.target.value } })} /></div>
                    <div className="space-y-2"><Label>Forma farm. e apresentação</Label><Input value={judicial.medicamento?.formaFarmaceuticaApresentacao ?? ''} onChange={(e) => setJ({ medicamento: { ...judicial.medicamento, formaFarmaceuticaApresentacao: e.target.value } })} /></div>
                    <div className="space-y-2"><Label>Dose</Label><Input value={judicial.medicamento?.dose ?? ''} onChange={(e) => setJ({ medicamento: { ...judicial.medicamento, dose: e.target.value } })} /></div>
                    <div className="space-y-2"><Label>Posologia</Label><Input value={judicial.medicamento?.posologia ?? ''} onChange={(e) => setJ({ medicamento: { ...judicial.medicamento, posologia: e.target.value } })} /></div>
                    <div className="space-y-2"><Label>Via de administração</Label><Input value={judicial.medicamento?.viaAdministracao ?? ''} onChange={(e) => setJ({ medicamento: { ...judicial.medicamento, viaAdministracao: e.target.value } })} /></div>
                    <div className="space-y-2"><Label>Duração do tratamento</Label><Input value={judicial.medicamento?.duracaoTratamento ?? ''} onChange={(e) => setJ({ medicamento: { ...judicial.medicamento, duracaoTratamento: e.target.value } })} /></div>
                  </div>
                </div>
              )}

              {judicial.tipoSolicitacao === 'procedimento' && (
                <TextField label="Descrição do procedimento" value={judicial.procedimentoDescricao} onChange={(v) => setJ({ procedimentoDescricao: v })} />
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={!!judicial.urgente} onCheckedChange={(c) => setJ({ urgente: !!c })} /> É urgente</label>
                  {judicial.urgente && <Textarea rows={2} placeholder="Por quê?" value={judicial.justificativaUrgencia ?? ''} onChange={(e) => setJ({ justificativaUrgencia: e.target.value })} />}
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={!!judicial.imprescindivel} onCheckedChange={(c) => setJ({ imprescindivel: !!c })} /> É imprescindível</label>
                  {judicial.imprescindivel && <Textarea rows={2} placeholder="Por quê?" value={judicial.justificativaImprescindivel ?? ''} onChange={(e) => setJ({ justificativaImprescindivel: e.target.value })} />}
                </div>
              </div>
              <TextField label="Benefícios esperados com o tratamento" value={judicial.beneficiosEsperados} onChange={(v) => setJ({ beneficiosEsperados: v })} />
              <TextField label="Consequências da não utilização" value={judicial.consequenciasNaoUso} onChange={(v) => setJ({ consequenciasNaoUso: v })} />
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Prescritor — nome</Label><Input value={judicial.prescritor?.nome ?? ''} onChange={(e) => setJ({ prescritor: { ...judicial.prescritor, nome: e.target.value } })} /></div>
                <div className="space-y-2"><Label>Registro (CRM/COREN)</Label><Input value={judicial.prescritor?.registro ?? ''} placeholder="CRM-SP 123456" onChange={(e) => setJ({ prescritor: { ...judicial.prescritor, registro: e.target.value } })} /></div>
                <div className="space-y-2"><Label>Especialidade</Label><Input value={judicial.prescritor?.especialidade ?? ''} onChange={(e) => setJ({ prescritor: { ...judicial.prescritor, especialidade: e.target.value } })} /></div>
              </div>
            </div>
          )}

          {/* --- Ficha VaPro --- */}
          <Separator />
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={incluirFicha} onCheckedChange={(c) => setIncluirFicha(!!c)} />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Ficha VaPro (Hollister) — Avaliação de Incontinência Urinária
            </span>
          </label>

          {incluirFicha && (
            <div className="space-y-4 glass rounded-xl p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Local de atendimento</Label>
                  <Select value={ficha.local ?? undefined} onValueChange={(v) => setF({ local: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{Object.values(LocalAtendimento).map((l) => <SelectItem key={l} value={l}>{LOCAL_LABEL[l]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Início dos sintomas</Label>
                  <Input value={ficha.inicioSintomas ?? ''} onChange={(e) => setF({ inicioSintomas: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Motivo da IU</Label>
                <Textarea rows={2} value={ficha.motivoIU ?? ''} onChange={(e) => setF({ motivoIU: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Perfil do cliente</Label>
                  <Select value={ficha.perfilCliente ?? undefined} onValueChange={(v) => setF({ perfilCliente: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{Object.values(PerfilCliente).map((x) => <SelectItem key={x} value={x}>{PERFIL_LABEL[x]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Destreza</Label>
                  <Select value={ficha.destreza ?? undefined} onValueChange={(v) => setF({ destreza: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{Object.values(Destreza).map((x) => <SelectItem key={x} value={x}>{DESTREZA_LABEL[x]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs">Tipo de Incontinência Urinária</Label>
                <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                  {Object.values(TipoIU).map((t) => (
                    <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={(ficha.tiposIU ?? []).includes(t)} onCheckedChange={() => toggleTipoIU(t)} /> {TIPO_IU_LABEL[t]}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={!!ficha.dntui} onCheckedChange={(c) => setF({ dntui: !!c })} /> DNTUI</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={!!ficha.miccaoEspontanea} onCheckedChange={(c) => setF({ miccaoEspontanea: !!c })} /> Micção espontânea</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={!!ficha.realizaCateterismo} onCheckedChange={(c) => setF({ realizaCateterismo: !!c })} /> Realiza cateterismo</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={!!ficha.emTratamento} onCheckedChange={(c) => setF({ emTratamento: !!c })} /> Em tratamento</label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Cateterismos/dia</Label><Input inputMode="numeric" value={ficha.cateterismosDia ?? ''} onChange={(e) => setF({ cateterismosDia: e.target.value ? Number(e.target.value) : undefined })} /></div>
                <div className="space-y-2"><Label>Cateter utilizado</Label><Input value={ficha.cateterUtilizado ?? ''} onChange={(e) => setF({ cateterUtilizado: e.target.value })} /></div>
                <div className="space-y-2"><Label>Última ITU</Label><Input value={ficha.ultimaInfeccaoUrinaria ?? ''} onChange={(e) => setF({ ultimaInfeccaoUrinaria: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Volume drenado</Label><Input value={ficha.volumeDrenado ?? ''} onChange={(e) => setF({ volumeDrenado: e.target.value })} /></div>
                <div className="space-y-2"><Label>Tratamento</Label><Input value={ficha.tratamento ?? ''} onChange={(e) => setF({ tratamento: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Outras intercorrências / medicamentos</Label><Textarea rows={2} value={ficha.outrasIntercorrencias ?? ''} onChange={(e) => setF({ outrasIntercorrencias: e.target.value })} /></div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Cateter VaPro — sexo</Label>
                  <Select value={ficha.cateterVaProIndicado?.sexo ?? undefined} onValueChange={(v) => setF({ cateterVaProIndicado: { ...ficha.cateterVaProIndicado, sexo: v } })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent><SelectItem value="feminino">Feminino</SelectItem><SelectItem value="masculino">Masculino</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>French (Fr)</Label><Input inputMode="numeric" value={ficha.cateterVaProIndicado?.french ?? ''} onChange={(e) => setF({ cateterVaProIndicado: { ...ficha.cateterVaProIndicado, french: e.target.value ? Number(e.target.value) : undefined } })} /></div>
                <div className="space-y-2">
                  <Label>Encaminhamento</Label>
                  <Select value={ficha.encaminhamento ?? undefined} onValueChange={(v) => setF({ encaminhamento: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{Object.values(EncaminhamentoIU).map((x) => <SelectItem key={x} value={x}>{ENCAMINHAMENTO_LABEL[x]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Responsável pelo cateterismo</Label><Input value={ficha.responsavelCateterismo ?? ''} onChange={(e) => setF({ responsavelCateterismo: e.target.value })} /></div>
                <div className="space-y-2"><Label>COREN</Label><Input value={ficha.coren ?? ''} onChange={(e) => setF({ coren: e.target.value })} /></div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={!!ficha.autorizaPesquisa} onCheckedChange={(c) => setF({ autorizaPesquisa: !!c })} /> Autoriza uso de dados (pesquisa Hollister)</label>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><Checkbox checked={!!ficha.aceitaInformacoes} onCheckedChange={(c) => setF({ aceitaInformacoes: !!c })} /> Aceita informações por e-mail/WhatsApp</label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>E-mail de contato</Label><Input value={ficha.emailContato ?? ''} onChange={(e) => setF({ emailContato: e.target.value })} /></div>
                <div className="space-y-2"><Label>WhatsApp de contato</Label><Input value={ficha.whatsappContato ?? ''} onChange={(e) => setF({ whatsappContato: e.target.value })} /></div>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={createMut.isPending}>{createMut.isPending ? 'Registrando...' : 'Registrar atendimento'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
