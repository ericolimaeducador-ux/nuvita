import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import {
  ACHADOS_PELE_PERILESIONAL,
  ASPECTOS_EXSUDATO,
  AVISOS_FERIDA,
  AVISOS_ITB,
  CARACTERISTICAS_BORDA,
  CATEGORIAS_LPP,
  DESFECHOS_AVALIACAO_LESAO,
  ESTRUTURAS_EXPOSTAS,
  ETIOLOGIAS_LESAO,
  FINALIDADES_ITB,
  LADOS_LESAO,
  MEMBROS_ITB,
  ODORES_EXSUDATO,
  QUANTIDADES_EXSUDATO,
  ROTULO_PROTOCOLO_SERVICO,
  ROTULO_SUSPEITA_BIOFILME,
  SINAIS_INFECCAO_ENCOBERTOS,
  SINAIS_INFECCAO_MANIFESTOS,
  SUBTIPOS_LESAO_UMIDADE,
  TECIDOS,
  TECNICAS_ERITEMA,
  avisosAvaliacaoLesao,
  avisosItb,
  validarIdentificacaoLesao,
  type AvaliacaoLesao,
  type EtiologiaLesao,
  type FotoMedida,
  type IdentificacaoLesao,
  type MedidaITB,
  type ModuloFerida,
} from '@shared/consulta';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { apiErrorMessage } from '@/api/client';
import { consultasApi, lesoesApi, produtosApi } from '@/api/resources';
import type { IdentificacaoLesaoRegistrada, Lesao } from '@/types';
import { MedicaoFoto, fmt, medicaoValida, type RascunhoMedicao } from './MedicaoFoto';

/**
 * Módulo FERIDA da consulta (etapa 5c), para paciente com classificação FA. SÓ REGISTRO: nenhuma escala com itens, nenhum
 * escore, nenhum semáforo, nenhuma conduta ou material sugerido, ZERO IA. Listas marcadas "protocolo do serviço" são do
 * serviço, não padrão de norma. TODO(conteudo): todos os rótulos abaixo são provisórios.
 */

// TODO(conteudo): rótulos provisórios.
export const ROTULO_FERIDA: Record<string, string> = {
  LESAO_POR_PRESSAO: 'Lesão por pressão', ULCERA_VENOSA: 'Úlcera venosa', ULCERA_ARTERIAL: 'Úlcera arterial', ULCERA_MISTA: 'Úlcera mista',
  PE_DIABETICO: 'Pé diabético', LESAO_UMIDADE: 'Lesão por umidade', LESAO_ADESIVO_MEDICO: 'Lesão por adesivo médico',
  LACERACAO_CUTANEA: 'Laceração cutânea', FERIDA_CIRURGICA: 'Ferida cirúrgica', TRAUMATICA: 'Traumática', OUTRA: 'Outra',
  DERMATITE_ASSOCIADA_INCONTINENCIA: 'Dermatite associada à incontinência', PERIESTOMAL: 'Periestomal', PERIFERIDA: 'Periferida', INTERTRIGINOSA: 'Intertriginosa',
  DIREITO: 'Direito', ESQUERDO: 'Esquerdo', CENTRAL: 'Central', NAO_SE_APLICA: 'Não se aplica',
  ABERTA: 'Aberta', CICATRIZADA: 'Cicatrizada', ENCERRADA: 'Encerrada', EM_ACOMPANHAMENTO: 'Em acompanhamento',
  I: 'Categoria I', II: 'Categoria II', III: 'Categoria III', IV: 'Categoria IV', NAO_CLASSIFICAVEL: 'Não classificável',
  SUSPEITA_LESAO_TISSULAR_PROFUNDA: 'Suspeita de lesão tissular profunda', MUCOSA: 'Lesão em mucosa',
  PRESSAO_DIGITAL: 'Pressão digital', DISCO_TRANSPARENTE: 'Disco transparente', NAO_REALIZADA: 'Não realizada',
  GRANULACAO: 'Granulação', EPITELIZACAO: 'Epitelização', HIPERGRANULACAO: 'Hipergranulação', ESFACELO: 'Esfacelo',
  NECROSE_SECA: 'Necrose seca', NECROSE_UMIDA: 'Necrose úmida', OSSO: 'Osso', TENDAO: 'Tendão', MUSCULO: 'Músculo',
  AUSENTE: 'Ausente', POUCO: 'Pouco', MODERADO: 'Moderado', ABUNDANTE: 'Abundante', PRESENTE: 'Presente',
  SEROSO: 'Seroso', SANGUINOLENTO: 'Sanguinolento', SEROSSANGUINOLENTO: 'Serossanguinolento', SEROPURULENTO: 'Seropurulento', PURULENTO: 'Purulento',
  REGULAR: 'Regular', IRREGULAR: 'Irregular', ADERIDA: 'Aderida', DESCOLADA_SOLAPADA: 'Descolada/solapada', MACERADA: 'Macerada',
  HIPERQUERATOSE: 'Hiperqueratose', EPIBOLE: 'Epíbole',
  INTEGRA: 'Íntegra', ERITEMA: 'Eritema', EDEMA: 'Edema', MACERACAO: 'Maceração', DESCAMACAO: 'Descamação', HIPERPIGMENTACAO: 'Hiperpigmentação',
  ENDURECIMENTO: 'Endurecimento', CALOR_LOCAL: 'Calor local', PRURIDO: 'Prurido',
  GRANULACAO_EXCESSIVA: 'Granulação excessiva', GRANULACAO_FRIAVEL: 'Granulação friável', PONTE_BOLSAS: 'Pontes/bolsas no leito',
  AUMENTO_DEGRADACAO: 'Aumento/degradação da lesão', CICATRIZACAO_LENTA: 'Cicatrização lenta', DOR_NOVA_OU_PIORA: 'Dor nova ou piora',
  ODOR_MAIS_FORTE: 'Odor mais forte', RUBOR: 'Rubor', CALOR: 'Calor', SECRECAO_PURULENTA: 'Secreção purulenta',
  RUBOR_EM_DISSEMINACAO: 'Rubor em disseminação', LINFANGITE: 'Linfangite', CREPITACAO: 'Crepitação',
  DIAGNOSTICO_DAP: 'Diagnóstico de DAP', SEGURANCA_COMPRESSAO: 'Segurança para compressão',
};
const r = (v: string) => ROTULO_FERIDA[v] ?? v;
const NENHUM = '__nenhum__';

export function descreverLesao(l: Pick<Lesao, 'numero' | 'localizacaoAnatomica' | 'etiologia' | 'etiologiaOutra' | 'lado'>): string {
  const etiologia = l.etiologia === 'OUTRA' && l.etiologiaOutra ? l.etiologiaOutra : r(l.etiologia);
  const lado = l.lado === 'NAO_SE_APLICA' ? '' : ` (${r(l.lado).toLowerCase()})`;
  return `Lesão ${l.numero} — ${l.localizacaoAnatomica}${lado} · ${etiologia}`;
}

function Aviso({ children, destaque }: { children: ReactNode; destaque?: boolean }) {
  return (
    <p className={`rounded border px-2 py-1 text-xs ${destaque ? 'border-amber-500 bg-amber-100 font-medium text-amber-950 dark:bg-amber-900 dark:text-amber-50' : 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100'}`}>
      {children}
    </p>
  );
}

function Protocolo() {
  return <Badge variant="outline" className="ml-2 text-[10px] font-normal">{ROTULO_PROTOCOLO_SERVICO}</Badge>;
}

interface Comum { editavel: boolean }

function Opcao({ rotulo, valor, opcoes, onChange, editavel, protocolo }: Comum & { rotulo: string; valor?: string; opcoes: readonly string[]; onChange: (v: string | undefined) => void; protocolo?: boolean }) {
  return (
    <div className="space-y-1">
      <Label>{rotulo}{protocolo && <Protocolo />}</Label>
      <Select value={valor ?? NENHUM} disabled={!editavel} onValueChange={(v) => onChange(v === NENHUM ? undefined : v)}>
        <SelectTrigger aria-label={rotulo}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NENHUM}>—</SelectItem>
          {opcoes.map((o) => <SelectItem key={o} value={o}>{r(o)}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function MultiOpcao({ rotulo, valores, opcoes, onChange, editavel, prefixo, protocolo }: Comum & { rotulo: string; valores?: string[]; opcoes: readonly string[]; onChange: (v: string[]) => void; prefixo: string; protocolo?: boolean }) {
  const atual = valores ?? [];
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-medium">{rotulo}{protocolo && <Protocolo />}</legend>
      <div className="flex flex-wrap gap-3">
        {opcoes.map((o) => (
          <div key={o} className="flex items-center gap-1.5">
            <Checkbox id={`${prefixo}-${o}`} disabled={!editavel} checked={atual.includes(o)}
              onCheckedChange={(c) => onChange(c ? [...atual, o] : atual.filter((x) => x !== o))} />
            <Label htmlFor={`${prefixo}-${o}`}>{r(o)}</Label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function Numero({ id, rotulo, valor, onChange, editavel, step = '0.1', min = 0, max }: Comum & { id: string; rotulo: string; valor?: number; onChange: (v: number | undefined) => void; step?: string; min?: number; max?: number }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{rotulo}</Label>
      <Input id={id} type="number" inputMode="decimal" step={step} min={min} max={max} readOnly={!editavel} value={valor ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
    </div>
  );
}

/** <input type="datetime-local"> <-> ISO 8601 com fuso (a API exige o fuso). */
const isoParaLocal = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const localParaIso = (v: string) => (v ? new Date(v).toISOString() : undefined);

// ---------------- cadastro de lesão (dentro do módulo) ----------------

function NovaLesaoForm({ pacienteId, onCriada, onCancelar }: { pacienteId: string; onCriada: (l: Lesao) => void; onCancelar: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Partial<IdentificacaoLesao> & { dataIdentificacao?: string }>({ lado: 'NAO_SE_APLICA', dataIdentificacao: new Date().toISOString().slice(0, 10) });
  const criar = useMutation({
    mutationFn: () => {
      const { dataIdentificacao, ...ident } = f;
      return lesoesApi.create(pacienteId, { ...(ident as IdentificacaoLesao), dataIdentificacao: dataIdentificacao ?? '' });
    },
    onSuccess: (l) => { void qc.invalidateQueries({ queryKey: ['lesoes', pacienteId] }); toast.success(`Lesão ${l.numero} cadastrada.`); onCriada(l); },
    onError: (e) => toast.error('Erro ao cadastrar a lesão', apiErrorMessage(e)),
  });
  const { dataIdentificacao: _d, ...ident } = f;
  const erros = validarIdentificacaoLesao(ident);
  return (
    <fieldset className="space-y-2 rounded border border-border p-3" aria-label="Cadastrar nova lesão">
      <legend className="px-1 text-sm font-medium">Cadastrar nova lesão</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="nl-loc">Localização anatômica *</Label>
          <Input id="nl-loc" value={f.localizacaoAnatomica ?? ''} onChange={(e) => setF({ ...f, localizacaoAnatomica: e.target.value })} />
        </div>
        <Opcao rotulo="Lado *" editavel valor={f.lado} opcoes={LADOS_LESAO} onChange={(v) => setF({ ...f, lado: v as IdentificacaoLesao['lado'] })} />
        <Opcao rotulo="Etiologia *" protocolo editavel valor={f.etiologia} opcoes={ETIOLOGIAS_LESAO}
          onChange={(v) => setF({ ...f, etiologia: v as EtiologiaLesao, subtipoUmidade: undefined, etiologiaOutra: undefined })} />
        {f.etiologia === 'LESAO_UMIDADE' && (
          <Opcao rotulo="Subtipo da lesão por umidade *" protocolo editavel valor={f.subtipoUmidade} opcoes={SUBTIPOS_LESAO_UMIDADE}
            onChange={(v) => setF({ ...f, subtipoUmidade: v as IdentificacaoLesao['subtipoUmidade'] })} />
        )}
        {f.etiologia === 'OUTRA' && (
          <div className="space-y-1">
            <Label htmlFor="nl-outra">Descreva a etiologia *</Label>
            <Input id="nl-outra" value={f.etiologiaOutra ?? ''} onChange={(e) => setF({ ...f, etiologiaOutra: e.target.value })} />
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="nl-data">Data de identificação *</Label>
          <Input id="nl-data" type="date" value={f.dataIdentificacao ?? ''} onChange={(e) => setF({ ...f, dataIdentificacao: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={erros.length > 0 || !f.dataIdentificacao || criar.isPending} onClick={() => criar.mutate()}>Cadastrar lesão</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancelar}>Cancelar</Button>
      </div>
    </fieldset>
  );
}

// ---------------- fotos e medição ----------------

function FotosLesao({ consultaId, lesaoId, fotos, editavel, onChange }: Comum & { consultaId: string; lesaoId: string; fotos: FotoMedida[]; onChange: (f: FotoMedida[]) => void }) {
  const qc = useQueryClient();
  const anexosQ = useQuery({ queryKey: ['consulta-anexos', consultaId], queryFn: () => consultasApi.listarAnexos(consultaId) });
  const daLesao = (anexosQ.data ?? []).filter((a) => a.lesaoId === lesaoId && a.mimeType !== 'application/pdf');
  // Rascunho por foto (a medição só entra no módulo quando completa e válida).
  const [rascunhos, setRascunhos] = useState<Record<string, RascunhoMedicao>>(() =>
    Object.fromEntries(fotos.map((f) => [f.anexoId, { anexoId: f.anexoId, calibracao: f.calibracao, contorno: f.contorno }])),
  );
  const enviar = useMutation({
    mutationFn: (file: File) => consultasApi.enviarAnexo(consultaId, file, lesaoId),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['consulta-anexos', consultaId] }); toast.success('Foto enviada. Calibre e contorne para medir.'); },
    onError: (e) => toast.error('Foto não enviada', apiErrorMessage(e)),
  });
  const atualizar = (rasc: RascunhoMedicao) => {
    setRascunhos((x) => ({ ...x, [rasc.anexoId]: rasc }));
    const valida = medicaoValida(rasc);
    const outras = fotos.filter((f) => f.anexoId !== rasc.anexoId);
    onChange(valida ? [...outras, valida] : outras);
  };
  const exibidas = editavel ? daLesao : daLesao.filter((a) => fotos.some((f) => f.anexoId === a.id));
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Fotos e medição por imagem</div>
      {exibidas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma foto.</p>}
      {exibidas.map((a) => (
        <MedicaoFoto key={a.id} consultaId={consultaId} editavel={editavel} onChange={atualizar}
          valor={rascunhos[a.id] ?? { anexoId: a.id, calibracao: {}, contorno: [] }} />
      ))}
      {editavel && (
        <div className="space-y-1">
          <Label htmlFor={`foto-${lesaoId}`}>Enviar foto (JPG ou PNG) — exige consentimento de imagem vigente</Label>
          <Input id={`foto-${lesaoId}`} type="file" accept="image/jpeg,image/png" disabled={enviar.isPending}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) enviar.mutate(f); e.target.value = ''; }} />
          <p className="text-xs text-muted-foreground">O consentimento é registrado na ficha do paciente (seção Lesões).</p>
        </div>
      )}
    </div>
  );
}

// ---------------- avaliação de uma lesão ----------------

/** Mesma identificação? (compara só os campos clínicos da identificação) */
function mesmaIdentificacao(a: IdentificacaoLesaoRegistrada, l: Lesao): boolean {
  return a.localizacaoAnatomica === l.localizacaoAnatomica && a.lado === l.lado && a.etiologia === l.etiologia
    && (a.subtipoUmidade ?? '') === (l.subtipoUmidade ?? '') && (a.etiologiaOutra ?? '') === (l.etiologiaOutra ?? '');
}

function AvaliacaoLesaoCampos({ consultaId, lesao, registrada, av, onChange, onRemover, editavel }: Comum & {
  consultaId: string; lesao?: Lesao; registrada?: IdentificacaoLesaoRegistrada; av: AvaliacaoLesao; onChange: (a: AvaliacaoLesao) => void; onRemover: () => void;
}) {
  const set = <K extends keyof AvaliacaoLesao>(k: K, v: AvaliacaoLesao[K]) => onChange({ ...av, [k]: v });
  const id = av.lesaoId;
  // Consulta assinada: as condicionais seguem a etiologia REGISTRADA no atendimento (não a corrigida depois).
  const etiologia = registrada?.etiologia ?? lesao?.etiologia;
  const percentuais = av.tecido?.percentuais ?? {};
  const soma = TECIDOS.reduce((s, t) => s + (percentuais[t] ?? 0), 0);
  const algumPercentual = TECIDOS.some((t) => percentuais[t] !== undefined);
  const produtosQ = useQuery({ queryKey: ['produtos'], queryFn: () => produtosApi.list(), enabled: editavel || (av.materiais ?? []).some((m) => m.produtoCodigo) });
  const adesivoCurto = (() => {
    const a = av.lesaoAdesivo?.observacaoRemocao?.em;
    const b = av.lesaoAdesivo?.observacao30min?.em;
    return a && b ? Date.parse(b) < Date.parse(a) + 30 * 60_000 : false;
  })();
  const avisos = avisosAvaliacaoLesao(av);

  return (
    <details open className="rounded-lg border border-border p-3" data-testid={`avaliacao-lesao-${id}`}>
      <summary className="flex cursor-pointer items-center gap-2 font-medium">
        <span className="flex-1">{registrada ? descreverLesao(registrada) : lesao ? descreverLesao(lesao) : 'Lesão'}</span>
        {editavel && (
          <Button type="button" variant="ghost" size="icon" aria-label="Remover esta lesão da avaliação" onClick={(e) => { e.preventDefault(); onRemover(); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </summary>
      <div className="space-y-3 pt-3">
        {registrada && (
          <div className="space-y-0.5 rounded border border-border bg-muted/40 p-2 text-xs" data-testid={`identificacao-${id}`}>
            <p><span className="font-medium">Identificação registrada neste atendimento:</span> {descreverLesao(registrada)}{registrada.subtipoUmidade ? ` · ${r(registrada.subtipoUmidade)}` : ''}</p>
            {lesao && !mesmaIdentificacao(registrada, lesao) && (
              <p><span className="font-medium">Identificação atual:</span> {descreverLesao(lesao)}{lesao.subtipoUmidade ? ` · ${r(lesao.subtipoUmidade)}` : ''}</p>
            )}
          </div>
        )}
        {etiologia === 'LESAO_POR_PRESSAO' && (
          <fieldset className="space-y-2 rounded border border-border p-2">
            <legend className="px-1 text-sm font-medium">Lesão por pressão</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <Opcao rotulo="Categoria *" editavel={editavel} valor={av.lpp?.categoria} opcoes={CATEGORIAS_LPP}
                onChange={(v) => set('lpp', { ...av.lpp, categoria: v as NonNullable<AvaliacaoLesao['lpp']>['categoria'] })} />
              <Opcao rotulo="Técnica para eritema" editavel={editavel} valor={av.lpp?.tecnicaEritema} opcoes={TECNICAS_ERITEMA}
                onChange={(v) => set('lpp', { ...av.lpp, tecnicaEritema: v as NonNullable<AvaliacaoLesao['lpp']>['tecnicaEritema'] })} />
            </div>
          </fieldset>
        )}

        {etiologia === 'LESAO_ADESIVO_MEDICO' && (
          <fieldset className="space-y-2 rounded border border-border p-2">
            <legend className="px-1 text-sm font-medium">Lesão por adesivo médico</legend>
            {(['observacaoRemocao', 'observacao30min'] as const).map((k) => (
              <div key={k} className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor={`${id}-${k}-em`}>{k === 'observacaoRemocao' ? 'Observação na remoção — data e hora *' : 'Segunda observação (≥ 30 min) — data e hora *'}</Label>
                  <Input id={`${id}-${k}-em`} type="datetime-local" readOnly={!editavel} value={isoParaLocal(av.lesaoAdesivo?.[k]?.em)}
                    onChange={(e) => set('lesaoAdesivo', { ...av.lesaoAdesivo, [k]: { ...av.lesaoAdesivo?.[k], em: localParaIso(e.target.value) } })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${id}-${k}-achado`}>Achado</Label>
                  <Input id={`${id}-${k}-achado`} readOnly={!editavel} value={av.lesaoAdesivo?.[k]?.achado ?? ''}
                    onChange={(e) => set('lesaoAdesivo', { ...av.lesaoAdesivo, [k]: { ...av.lesaoAdesivo?.[k], achado: e.target.value } })} />
                </div>
              </div>
            ))}
            {adesivoCurto && <p role="alert" className="text-sm text-destructive">{AVISOS_FERIDA.adesivo30min}</p>}
          </fieldset>
        )}

        <fieldset className="space-y-2 rounded border border-border p-2">
          <legend className="px-1 text-sm font-medium">Tecido do leito (%)<Protocolo /></legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TECIDOS.map((t) => (
              <Numero key={t} id={`${id}-tec-${t}`} rotulo={r(t)} editavel={editavel} step="1" max={100} valor={percentuais[t]}
                onChange={(v) => set('tecido', { ...av.tecido, percentuais: { ...percentuais, [t]: v } })} />
            ))}
          </div>
          {algumPercentual && (
            <p className={`text-xs ${soma === 100 ? 'text-muted-foreground' : 'text-destructive'}`}>Soma: {soma}% {soma !== 100 && '(deve ser 100%)'}</p>
          )}
          <MultiOpcao rotulo="Estruturas expostas" prefixo={`${id}-estr`} editavel={editavel} valores={av.tecido?.estruturasExpostas} opcoes={ESTRUTURAS_EXPOSTAS}
            onChange={(v) => set('tecido', { ...av.tecido, estruturasExpostas: v as NonNullable<AvaliacaoLesao['tecido']>['estruturasExpostas'] })} />
        </fieldset>

        <fieldset className="space-y-2 rounded border border-border p-2">
          <legend className="px-1 text-sm font-medium">Exsudato<Protocolo /></legend>
          <div className="grid gap-2 sm:grid-cols-3">
            <Opcao rotulo="Quantidade" editavel={editavel} valor={av.exsudato?.quantidade} opcoes={QUANTIDADES_EXSUDATO}
              onChange={(v) => set('exsudato', { ...av.exsudato, quantidade: v as NonNullable<AvaliacaoLesao['exsudato']>['quantidade'], ...(v === 'AUSENTE' ? { aspecto: undefined } : {}) })} />
            {av.exsudato?.quantidade && av.exsudato.quantidade !== 'AUSENTE' && (
              <Opcao rotulo="Aspecto *" editavel={editavel} valor={av.exsudato?.aspecto} opcoes={ASPECTOS_EXSUDATO}
                onChange={(v) => set('exsudato', { ...av.exsudato, aspecto: v as NonNullable<AvaliacaoLesao['exsudato']>['aspecto'] })} />
            )}
            <Opcao rotulo="Odor" editavel={editavel} valor={av.exsudato?.odor} opcoes={ODORES_EXSUDATO}
              onChange={(v) => set('exsudato', { ...av.exsudato, odor: v as NonNullable<AvaliacaoLesao['exsudato']>['odor'] })} />
          </div>
        </fieldset>

        <fieldset className="space-y-2 rounded border border-border p-2">
          <legend className="px-1 text-sm font-medium">Borda</legend>
          <MultiOpcao rotulo="Características" protocolo prefixo={`${id}-borda`} editavel={editavel} valores={av.borda?.caracteristicas} opcoes={CARACTERISTICAS_BORDA}
            onChange={(v) => set('borda', { ...av.borda, caracteristicas: v as NonNullable<AvaliacaoLesao['borda']>['caracteristicas'] })} />
          <div className="space-y-1">
            <div className="text-sm">Túneis</div>
            {(av.borda?.tuneis ?? []).map((t, i) => (
              <div key={i} className="flex items-end gap-2">
                <Numero id={`${id}-tun-${i}-prof`} rotulo="Profundidade (cm)" editavel={editavel} valor={t.profundidadeCm}
                  onChange={(v) => set('borda', { ...av.borda, tuneis: (av.borda?.tuneis ?? []).map((x, j) => (j === i ? { ...x, profundidadeCm: v } : x)) })} />
                <Numero id={`${id}-tun-${i}-hora`} rotulo="Posição (hora 1–12)" editavel={editavel} step="1" min={1} max={12} valor={t.posicaoHora}
                  onChange={(v) => set('borda', { ...av.borda, tuneis: (av.borda?.tuneis ?? []).map((x, j) => (j === i ? { ...x, posicaoHora: v } : x)) })} />
                {editavel && (
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remover túnel ${i + 1}`}
                    onClick={() => set('borda', { ...av.borda, tuneis: (av.borda?.tuneis ?? []).filter((_, j) => j !== i) })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            {editavel && (
              <Button type="button" size="sm" variant="outline" onClick={() => set('borda', { ...av.borda, tuneis: [...(av.borda?.tuneis ?? []), {}] })}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar túnel
              </Button>
            )}
          </div>
        </fieldset>

        <MultiOpcao rotulo="Pele perilesional" protocolo prefixo={`${id}-pele`} editavel={editavel} valores={av.pelePerilesional} opcoes={ACHADOS_PELE_PERILESIONAL}
          onChange={(v) => {
            // ÍNTEGRA exclui as demais: marcar ÍNTEGRA limpa o resto; marcar outro achado desmarca ÍNTEGRA.
            const antes = av.pelePerilesional ?? [];
            const novo = v.includes('INTEGRA') && !antes.includes('INTEGRA') ? ['INTEGRA'] : v.filter((x) => x !== 'INTEGRA' || v.length === 1);
            set('pelePerilesional', novo as AvaliacaoLesao['pelePerilesional']);
          }} />

        <fieldset className="space-y-2 rounded border border-border p-2">
          <legend className="px-1 text-sm font-medium">Sinais de infecção</legend>
          <MultiOpcao rotulo="Sinais encobertos" prefixo={`${id}-enc`} editavel={editavel} valores={av.infeccao?.sinaisEncobertos} opcoes={SINAIS_INFECCAO_ENCOBERTOS}
            onChange={(v) => set('infeccao', { ...av.infeccao, sinaisEncobertos: v as NonNullable<AvaliacaoLesao['infeccao']>['sinaisEncobertos'] })} />
          <MultiOpcao rotulo="Sinais manifestos" prefixo={`${id}-man`} editavel={editavel} valores={av.infeccao?.sinaisManifestos} opcoes={SINAIS_INFECCAO_MANIFESTOS}
            onChange={(v) => set('infeccao', { ...av.infeccao, sinaisManifestos: v as NonNullable<AvaliacaoLesao['infeccao']>['sinaisManifestos'] })} />
          <div className="flex items-center gap-2">
            <Checkbox id={`${id}-sist`} disabled={!editavel} checked={!!av.infeccao?.respostaSistemica} onCheckedChange={(c) => set('infeccao', { ...av.infeccao, respostaSistemica: !!c })} />
            <Label htmlFor={`${id}-sist`}>Resposta sistêmica</Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id={`${id}-bio`} disabled={!editavel} checked={!!av.infeccao?.suspeitaBiofilme} onCheckedChange={(c) => set('infeccao', { ...av.infeccao, suspeitaBiofilme: !!c })} />
            <Label htmlFor={`${id}-bio`}>{ROTULO_SUSPEITA_BIOFILME}</Label>
          </div>
          <p className="text-xs text-muted-foreground">{AVISOS_FERIDA.biofilme}</p>
          <div className="space-y-1">
            <Label htmlFor={`${id}-imp`}>Impressão clínica</Label>
            <Textarea id={`${id}-imp`} rows={2} readOnly={!editavel} value={av.infeccao?.impressaoClinica ?? ''} onChange={(e) => set('infeccao', { ...av.infeccao, impressaoClinica: e.target.value })} />
          </div>
        </fieldset>

        {avisos.length > 0 && <div className="space-y-1">{avisos.map((a) => <Aviso key={a}>{a}</Aviso>)}</div>}

        <fieldset className="space-y-2 rounded border border-border p-2">
          <legend className="px-1 text-sm font-medium">Medidas</legend>
          <div className="text-sm">Manual <Badge variant="secondary">MANUAL</Badge></div>
          <div className="grid gap-2 sm:grid-cols-3">
            {(['comprimentoCm', 'larguraCm', 'profundidadeCm'] as const).map((k) => (
              <Numero key={k} id={`${id}-man-${k}`} editavel={editavel} valor={av.medidas?.manual?.[k]}
                rotulo={{ comprimentoCm: 'Comprimento (cm)', larguraCm: 'Largura (cm)', profundidadeCm: 'Profundidade (cm)' }[k]}
                onChange={(v) => set('medidas', { ...av.medidas, manual: { ...av.medidas?.manual, [k]: v } })} />
            ))}
          </div>
          {(av.medidas?.fotos ?? []).length > 0 && (
            <ul className="space-y-1 text-sm">
              {(av.medidas?.fotos ?? []).map((f) => f.resultado && (
                <li key={f.anexoId}><Badge variant="secondary">FOTO</Badge> {AVISOS_FERIDA.estimativaImagem}: área {fmt(f.resultado.areaCm2)} cm² · comprimento {fmt(f.resultado.comprimentoCm)} cm · largura {fmt(f.resultado.larguraCm)} cm</li>
              ))}
            </ul>
          )}
          <FotosLesao consultaId={consultaId} lesaoId={id} editavel={editavel} fotos={av.medidas?.fotos ?? []}
            onChange={(fotos) => set('medidas', { ...av.medidas, fotos })} />
        </fieldset>

        <fieldset className="space-y-2 rounded border border-border p-2">
          <legend className="px-1 text-sm font-medium">Materiais utilizados (registro)</legend>
          {(av.materiais ?? []).map((m, i) => (
            <div key={i} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-1">
                <Label>Produto do catálogo</Label>
                <Select value={m.produtoCodigo ? String(m.produtoCodigo) : NENHUM} disabled={!editavel}
                  onValueChange={(v) => set('materiais', (av.materiais ?? []).map((x, j) => (j === i ? { ...x, produtoCodigo: v === NENHUM ? undefined : Number(v) } : x)))}>
                  <SelectTrigger aria-label={`Produto do material ${i + 1}`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NENHUM}>—</SelectItem>
                    {(produtosQ.data ?? []).map((p) => <SelectItem key={p.codigo} value={String(p.codigo)}>{p.nome}</SelectItem>)}
                    {m.produtoCodigo && !(produtosQ.data ?? []).some((p) => p.codigo === m.produtoCodigo) && (
                      <SelectItem value={String(m.produtoCodigo)}>Código {m.produtoCodigo}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${id}-mat-${i}`}>Descrição</Label>
                <Input id={`${id}-mat-${i}`} readOnly={!editavel} value={m.descricao ?? ''}
                  onChange={(e) => set('materiais', (av.materiais ?? []).map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)))} />
              </div>
              {editavel && (
                <Button type="button" variant="ghost" size="icon" aria-label={`Remover material ${i + 1}`} onClick={() => set('materiais', (av.materiais ?? []).filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {editavel && (
            <Button type="button" size="sm" variant="outline" onClick={() => set('materiais', [...(av.materiais ?? []), {}])}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar material
            </Button>
          )}
        </fieldset>

        <fieldset className="space-y-2 rounded border border-border p-2">
          <legend className="px-1 text-sm font-medium">Desfecho desta avaliação</legend>
          <p className="text-xs text-muted-foreground">O status da lesão só muda quando a consulta for assinada.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Opcao rotulo="Situação *" editavel={editavel} valor={av.desfecho?.situacao} opcoes={DESFECHOS_AVALIACAO_LESAO}
              onChange={(v) => set('desfecho', { situacao: v as NonNullable<AvaliacaoLesao['desfecho']>['situacao'], ...(v === 'ENCERRADA' ? { motivo: av.desfecho?.motivo } : {}) })} />
            {av.desfecho?.situacao === 'ENCERRADA' && (
              <div className="space-y-1">
                <Label htmlFor={`${id}-motivo`}>Motivo do encerramento *</Label>
                <Input id={`${id}-motivo`} readOnly={!editavel} value={av.desfecho.motivo ?? ''} onChange={(e) => set('desfecho', { ...av.desfecho, motivo: e.target.value })} />
              </div>
            )}
          </div>
        </fieldset>
      </div>
    </details>
  );
}

// ---------------- ITB ----------------

function ItbCampos({ itb, onChange, editavel }: Comum & { itb: MedidaITB[]; onChange: (v: MedidaITB[]) => void }) {
  const livres = MEMBROS_ITB.filter((m) => !itb.some((x) => x.membro === m));
  return (
    <fieldset className="space-y-2 rounded-lg border border-border p-3" aria-label="Índice tornozelo-braquial">
      <legend className="px-1 font-medium">Índice tornozelo-braquial (opcional)</legend>
      <Aviso destaque>{AVISOS_ITB.faixaDiagnosticoNaoDecideCompressao}</Aviso>
      {itb.map((m, i) => {
        const upd = (p: Partial<MedidaITB>) => onChange(itb.map((x, j) => (j === i ? { ...x, ...p } : x)));
        return (
          <div key={m.membro ?? i} className="space-y-2 rounded border border-border p-2" data-testid={`itb-${m.membro}`}>
            <div className="flex items-center gap-2">
              <span className="flex-1 text-sm font-medium">Membro {m.membro ? r(m.membro).toLowerCase() : ''}</span>
              {editavel && (
                <Button type="button" variant="ghost" size="icon" aria-label={`Remover ITB ${m.membro ?? ''}`} onClick={() => onChange(itb.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Numero id={`itb-${m.membro}-valor`} rotulo="Valor *" editavel={editavel} step="0.01" min={0.1} max={3} valor={m.valor} onChange={(v) => upd({ valor: v })} />
              <Opcao rotulo="Finalidade *" editavel={editavel} valor={m.finalidade} opcoes={FINALIDADES_ITB} onChange={(v) => upd({ finalidade: v as MedidaITB['finalidade'] })} />
              <div className="space-y-1">
                <Label htmlFor={`itb-${m.membro}-met`}>Método / equipamento</Label>
                <Input id={`itb-${m.membro}-met`} readOnly={!editavel} value={m.metodoEquipamento ?? ''} onChange={(e) => upd({ metodoEquipamento: e.target.value })} />
              </div>
            </div>
            {!m.finalidade && <p className="text-xs text-destructive">Informe a finalidade da medida.</p>}
            {avisosItb(m).map((a) => <Aviso key={a}>{a}</Aviso>)}
          </div>
        );
      })}
      {editavel && livres.map((membro) => (
        <Button key={membro} type="button" size="sm" variant="outline" onClick={() => onChange([...itb, { membro }])}>
          <Plus className="mr-1 h-4 w-4" /> ITB membro {r(membro).toLowerCase()}
        </Button>
      ))}
    </fieldset>
  );
}

// ---------------- módulo ----------------

export function ModuloFeridaCampos({ consultaId, pacienteId, dados, onChange, editavel, identificacoesLesoes }: Comum & {
  consultaId: string; pacienteId: string; dados: ModuloFerida; onChange: (d: ModuloFerida) => void; identificacoesLesoes?: IdentificacaoLesaoRegistrada[];
}) {
  const lesoesQ = useQuery({ queryKey: ['lesoes', pacienteId], queryFn: () => lesoesApi.listByPaciente(pacienteId), enabled: !!pacienteId });
  const [cadastrando, setCadastrando] = useState(false);
  const [escolhida, setEscolhida] = useState<string>(NENHUM);
  const avaliacoes = dados.avaliacoes ?? [];
  const lesoes = lesoesQ.data ?? [];
  const porId = new Map(lesoes.map((l) => [l.id, l]));
  const avaliadas = new Set(avaliacoes.map((a) => a.lesaoId));
  const abertasLivres = lesoes.filter((l) => l.status === 'ABERTA' && !avaliadas.has(l.id));
  const adicionar = (lesaoId: string) => onChange({ ...dados, avaliacoes: [...avaliacoes, { lesaoId, desfecho: { situacao: 'EM_ACOMPANHAMENTO' } }] });
  useEffect(() => { if (escolhida !== NENHUM && avaliadas.has(escolhida)) setEscolhida(NENHUM); }, [escolhida, avaliadas]);

  return (
    <div className="space-y-3" data-testid="modulo-ferida">
      {editavel && (
        <div className="flex flex-wrap items-end gap-2 rounded border border-dashed border-border p-2">
          <div className="min-w-[16rem] flex-1 space-y-1">
            <Label>Avaliar lesão aberta</Label>
            <Select value={escolhida} onValueChange={setEscolhida}>
              <SelectTrigger aria-label="Lesão aberta"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NENHUM}>{abertasLivres.length === 0 ? 'Nenhuma lesão aberta disponível' : '—'}</SelectItem>
                {abertasLivres.map((l) => <SelectItem key={l.id} value={l.id}>{descreverLesao(l)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" size="sm" disabled={escolhida === NENHUM} onClick={() => { adicionar(escolhida); setEscolhida(NENHUM); }}>Avaliar</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setCadastrando(true)}><Plus className="mr-1 h-4 w-4" /> Cadastrar nova lesão</Button>
        </div>
      )}
      {cadastrando && editavel && (
        <NovaLesaoForm pacienteId={pacienteId} onCancelar={() => setCadastrando(false)} onCriada={(l) => { setCadastrando(false); adicionar(l.id); }} />
      )}
      {avaliacoes.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma lesão avaliada nesta consulta.</p>}
      {avaliacoes.map((av, i) => (
        <AvaliacaoLesaoCampos key={av.lesaoId} consultaId={consultaId} lesao={porId.get(av.lesaoId)} av={av} editavel={editavel}
          registrada={identificacoesLesoes?.find((x) => x.lesaoId === av.lesaoId)}
          onChange={(a) => onChange({ ...dados, avaliacoes: avaliacoes.map((x, j) => (j === i ? a : x)) })}
          onRemover={() => onChange({ ...dados, avaliacoes: avaliacoes.filter((_, j) => j !== i) })} />
      ))}
      <ItbCampos editavel={editavel} itb={dados.itb ?? []} onChange={(itb) => onChange({ ...dados, itb })} />
    </div>
  );
}
