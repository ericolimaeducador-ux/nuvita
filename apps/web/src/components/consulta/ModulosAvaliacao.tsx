import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Paperclip, Plus, Trash2 } from 'lucide-react';
import {
  AVISOS_ANAL,
  AVISOS_IU,
  AreaModuloAvaliacao,
  CONSISTENCIAS_FEZES,
  ITENS_FITA,
  METODOS_RPM,
  ORIGENS_INFORMACAO,
  PREDOMINANTES_IU,
  RESULTADOS_FITA,
  SINAIS_ALARME_ANAL,
  SUBTIPOS_PERDA_ANAL,
  TIPOS_IU,
  TIPOS_PERDA_ANAL,
  alertasModuloIU,
  alertasModuloIncontinenciaAnal,
  modulosDisponiveis,
  type Diario,
  type ItemExame,
  type ModuloIU,
  type ModuloFerida,
  type ModuloIncontinenciaAnal,
  type TipoIU,
} from '@shared/consulta';
import type { ClassificacaoArea as ClassificacaoAreaShared } from '@shared/paciente/classificacao';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { apiErrorMessage } from '@/api/client';
import { consultasApi } from '@/api/resources';
import type { AnexoConsulta } from '@/types';
import { ModuloFeridaCampos } from './ModuloFerida';

/**
 * Módulos da etapa Avaliação: Incontinência urinária e Incontinência anal (5b, classificação IU) e Feridas (5c,
 * classificação FA), oferecidos só para a classificação do paciente que os libera. Só registro: nenhum instrumento com itens, nenhuma conduta automática, nenhuma gravidade.
 * TODO(conteudo): todos os rótulos abaixo são provisórios e precisam de revisão.
 */

export interface ModuloForm {
  area: AreaModuloAvaliacao;
  dados: Record<string, unknown>;
}

// TODO(conteudo): rótulos provisórios.
const NOME_MODULO: Partial<Record<AreaModuloAvaliacao, string>> = {
  [AreaModuloAvaliacao.IU]: 'Incontinência urinária',
  [AreaModuloAvaliacao.INCONTINENCIA_ANAL]: 'Incontinência anal',
  [AreaModuloAvaliacao.FERIDA]: 'Feridas',
};
const ROTULO: Record<string, string> = {
  ESFORCO: 'Esforço', URGENCIA: 'Urgência', MISTA: 'Mista', INDEFINIDA: 'Indefinida',
  ULTRASSOM: 'Ultrassom', CATETERISMO: 'Cateterismo',
  POSITIVO: 'Positivo', NEGATIVO: 'Negativo', NAO_REALIZADO: 'Não realizado',
  SOLIDAS: 'Sólidas', LIQUIDAS: 'Líquidas', GASES: 'Gases',
  PASSIVA: 'Passiva', POS_DEFECATORIA: 'Pós-defecatória',
  SOLIDA: 'Sólida', PASTOSA: 'Pastosa', LIQUIDA: 'Líquida',
  PACIENTE: 'Paciente', PROFISSIONAL: 'Profissional',
  MUDANCA_HABITO_INTESTINAL: 'Mudança do hábito intestinal', PERDA_PESO_INEXPLICADA: 'Perda de peso inexplicada',
  ANEMIA: 'Anemia', SANGRAMENTO: 'Sangramento',
  abdominal: 'Abdominal', testeEsforcoTosse: 'Teste de esforço (tosse)', neurourologicoFocado: 'Neurourológico focado',
  vaginalDigital: 'Vaginal digital', retalDigital: 'Retal digital', inspecaoPerianal: 'Inspeção perianal',
  sangue: 'Sangue', glicose: 'Glicose', proteina: 'Proteína', leucocitos: 'Leucócitos', nitritos: 'Nitritos',
};
const r = (v: string) => ROTULO[v] ?? v;
const NENHUM = '__nenhum__';

function Aviso({ children }: { children: ReactNode }) {
  return <p className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">{children}</p>;
}

interface Comum { editavel: boolean }

function CampoTexto({ id, rotulo, valor, onChange, editavel, rows = 2 }: Comum & { id: string; rotulo: string; valor?: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{rotulo}</Label>
      <Textarea id={id} rows={rows} readOnly={!editavel} value={valor ?? ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Opcao({ rotulo, valor, opcoes, onChange, editavel }: Comum & { rotulo: string; valor?: string; opcoes: readonly string[]; onChange: (v: string | undefined) => void }) {
  return (
    <div className="space-y-1">
      <Label>{rotulo}</Label>
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

function MultiOpcao({ rotulo, valores, opcoes, onChange, editavel, prefixo }: Comum & { rotulo: string; valores?: string[]; opcoes: readonly string[]; onChange: (v: string[]) => void; prefixo: string }) {
  const atual = valores ?? [];
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-medium">{rotulo}</legend>
      <div className="flex flex-wrap gap-3">
        {opcoes.map((o) => (
          <div key={o} className="flex items-center gap-1.5">
            <Checkbox
              id={`${prefixo}-${o}`}
              disabled={!editavel}
              checked={atual.includes(o)}
              onCheckedChange={(c) => onChange(c ? [...atual, o] : atual.filter((x) => x !== o))}
            />
            <Label htmlFor={`${prefixo}-${o}`}>{r(o)}</Label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function ItemExameCampo({ id, rotulo, valor, onChange, editavel, aviso }: Comum & { id: string; rotulo: string; valor?: ItemExame; onChange: (v: ItemExame | undefined) => void; aviso?: string }) {
  return (
    <div className="space-y-1 rounded border border-border p-2">
      <div className="flex items-center gap-2">
        <Checkbox id={`${id}-realizado`} disabled={!editavel} checked={!!valor?.realizado} onCheckedChange={(c) => onChange({ ...valor, realizado: !!c })} />
        <Label htmlFor={`${id}-realizado`}>{rotulo} — realizado</Label>
      </div>
      {aviso && <Aviso>{aviso}</Aviso>}
      {valor?.realizado && (
        <Input aria-label={`Achado: ${rotulo}`} readOnly={!editavel} value={valor.achado ?? ''} onChange={(e) => onChange({ ...valor, achado: e.target.value })} placeholder="Achado" />
      )}
    </div>
  );
}

function AnexoItem({ consultaId, anexo }: { consultaId: string; anexo: AnexoConsulta }) {
  const [url, setUrl] = useState<string | null>(null);
  const abrir = useMutation({
    mutationFn: () => consultasApi.urlAnexo(consultaId, anexo.id),
    onSuccess: (r) => setUrl(r.accessUrl),
    onError: (e) => toast.error('Não foi possível abrir o anexo', apiErrorMessage(e)),
  });
  return (
    <li className="space-y-1 rounded border border-border p-2 text-sm">
      <div className="flex items-center gap-2">
        <Paperclip className="h-4 w-4" />
        <span className="flex-1">{anexo.mimeType === 'application/pdf' ? 'PDF' : 'Imagem'} · {Math.ceil(anexo.tamanho / 1024)} KB</span>
        {!url && <Button type="button" size="sm" variant="outline" onClick={() => abrir.mutate()} disabled={abrir.isPending}>Ver</Button>}
      </div>
      {url && (anexo.mimeType === 'application/pdf'
        ? <a className="text-sm underline" href={url} target="_blank" rel="noreferrer">Abrir PDF</a>
        : <img src={url} alt="Pré-visualização do anexo" className="max-h-64 rounded border border-border" />)}
    </li>
  );
}

function DiarioCampo({ id, rotulo, consultaId, valor, onChange, editavel, alertas }: Comum & { id: string; rotulo: string; consultaId: string; valor?: Diario; onChange: (v: Diario) => void; alertas: string[] }) {
  const qc = useQueryClient();
  const anexosQ = useQuery({ queryKey: ['consulta-anexos', consultaId], queryFn: () => consultasApi.listarAnexos(consultaId) });
  const citados = new Set(valor?.anexos ?? []);
  const anexos = (anexosQ.data ?? []).filter((a) => citados.has(a.id));
  const enviar = useMutation({
    mutationFn: (file: File) => consultasApi.enviarAnexo(consultaId, file),
    onSuccess: (anexo) => {
      onChange({ ...valor, anexos: [...(valor?.anexos ?? []), anexo.id] });
      void qc.invalidateQueries({ queryKey: ['consulta-anexos', consultaId] });
      toast.success('Anexo enviado. Salve o rascunho para vinculá-lo ao diário.');
    },
    onError: (e) => toast.error('Erro ao enviar o anexo', apiErrorMessage(e)),
  });
  return (
    <fieldset className="space-y-2 rounded border border-border p-2">
      <legend className="px-1 text-sm font-medium">{rotulo}</legend>
      {alertas.map((a) => <Aviso key={a}>{a}</Aviso>)}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`${id}-ini`}>Início</Label>
          <Input id={`${id}-ini`} type="date" readOnly={!editavel} value={valor?.dataInicio ?? ''} onChange={(e) => onChange({ ...valor, dataInicio: e.target.value || undefined })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${id}-fim`}>Fim</Label>
          <Input id={`${id}-fim`} type="date" readOnly={!editavel} value={valor?.dataFim ?? ''} onChange={(e) => onChange({ ...valor, dataFim: e.target.value || undefined })} />
        </div>
      </div>
      <div className="grid gap-2 lg:grid-cols-2">
        <div className="space-y-2">
          <Label>Anexos (foto ou PDF do diário em papel)</Label>
          {anexos.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum anexo.</p> : (
            <ul className="space-y-1">{anexos.map((a) => <AnexoItem key={a.id} consultaId={consultaId} anexo={a} />)}</ul>
          )}
          {editavel && (
            <Input
              aria-label={`Enviar anexo: ${rotulo}`}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              disabled={enviar.isPending}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) enviar.mutate(f); e.target.value = ''; }}
            />
          )}
        </div>
        <CampoTexto id={`${id}-resumo`} rotulo="Resumo" valor={valor?.resumo} editavel={editavel} rows={5} onChange={(v) => onChange({ ...valor, resumo: v })} />
      </div>
    </fieldset>
  );
}

function ModuloIUCampos({ consultaId, dados, onChange, editavel }: Comum & { consultaId: string; dados: ModuloIU; onChange: (d: ModuloIU) => void }) {
  const set = <K extends keyof ModuloIU>(k: K, v: ModuloIU[K]) => onChange({ ...dados, [k]: v });
  const [mostrarAbsorvente, setMostrarAbsorvente] = useState(!!dados.testeAbsorvente);
  const ef = dados.exameFisico ?? {};
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <CampoTexto id="iu-sint" rotulo="Sintomas" editavel={editavel} valor={dados.anamnese?.sintomas} onChange={(v) => set('anamnese', { ...dados.anamnese, sintomas: v })} />
        <CampoTexto id="iu-comorb" rotulo="Comorbidades" editavel={editavel} valor={dados.anamnese?.comorbidades} onChange={(v) => set('anamnese', { ...dados.anamnese, comorbidades: v })} />
        <CampoTexto id="iu-fat" rotulo="Fatores predisponentes e precipitantes" editavel={editavel} valor={dados.anamnese?.fatoresPredisponentesPrecipitantes} onChange={(v) => set('anamnese', { ...dados.anamnese, fatoresPredisponentesPrecipitantes: v })} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Opcao rotulo="Classificação inicial" editavel={editavel} valor={dados.classificacaoInicial?.tipo} opcoes={TIPOS_IU}
          onChange={(v) => set('classificacaoInicial', { tipo: v as TipoIU | undefined, predominante: v === 'MISTA' ? dados.classificacaoInicial?.predominante : undefined })} />
        {dados.classificacaoInicial?.tipo === 'MISTA' && (
          <Opcao rotulo="Sintoma predominante *" editavel={editavel} valor={dados.classificacaoInicial?.predominante} opcoes={PREDOMINANTES_IU}
            onChange={(v) => set('classificacaoInicial', { ...dados.classificacaoInicial, predominante: v as 'ESFORCO' | 'URGENCIA' | undefined })} />
        )}
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium">Exame físico</div>
        {(['abdominal', 'testeEsforcoTosse', 'neurourologicoFocado', 'vaginalDigital', 'retalDigital'] as const).map((item) => (
          <ItemExameCampo key={item} id={`iu-ef-${item}`} rotulo={r(item)} editavel={editavel} valor={ef[item]}
            aviso={item === 'vaginalDigital' || item === 'retalDigital' ? AVISOS_IU.toqueCompetencia : undefined}
            onChange={(v) => set('exameFisico', { ...ef, [item]: v })} />
        ))}
      </div>
      <fieldset className="space-y-2 rounded border border-border p-2">
        <legend className="px-1 text-sm font-medium">Resíduo pós-miccional</legend>
        <Aviso>{AVISOS_IU.rpmMetodo}</Aviso>
        <Aviso>{AVISOS_IU.rpmConflito}</Aviso>
        <div className="flex items-center gap-2">
          <Checkbox id="iu-rpm-realizado" disabled={!editavel} checked={!!dados.residuoPosMiccional?.realizado} onCheckedChange={(c) => set('residuoPosMiccional', { ...dados.residuoPosMiccional, realizado: !!c })} />
          <Label htmlFor="iu-rpm-realizado">Realizado</Label>
        </div>
        {dados.residuoPosMiccional?.realizado && (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="iu-rpm-vol">Volume (mL)</Label>
              <Input id="iu-rpm-vol" type="number" min={0} readOnly={!editavel} value={dados.residuoPosMiccional.volumeMl ?? ''}
                onChange={(e) => set('residuoPosMiccional', { ...dados.residuoPosMiccional!, volumeMl: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </div>
            <Opcao rotulo="Método" editavel={editavel} valor={dados.residuoPosMiccional.metodo} opcoes={METODOS_RPM}
              onChange={(v) => set('residuoPosMiccional', { ...dados.residuoPosMiccional!, metodo: v as 'ULTRASSOM' | 'CATETERISMO' | undefined })} />
          </div>
        )}
      </fieldset>
      <fieldset className="space-y-2 rounded border border-border p-2">
        <legend className="px-1 text-sm font-medium">Urinálise (fita)</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {ITENS_FITA.map((item) => (
            <Opcao key={item} rotulo={r(item)} editavel={editavel} valor={dados.urinaliseFita?.[item]} opcoes={RESULTADOS_FITA}
              onChange={(v) => set('urinaliseFita', { ...dados.urinaliseFita, [item]: v })} />
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2 rounded border border-border p-2">
        <legend className="px-1 text-sm font-medium">Urodinâmica</legend>
        <Aviso>{AVISOS_IU.urodinamica}</Aviso>
        <div className="flex items-center gap-2">
          <Checkbox id="iu-uro" disabled={!editavel} checked={!!dados.urodinamica?.encaminhamentoIndicado} onCheckedChange={(c) => set('urodinamica', { ...dados.urodinamica, encaminhamentoIndicado: !!c })} />
          <Label htmlFor="iu-uro">Encaminhamento indicado</Label>
        </div>
        {dados.urodinamica?.encaminhamentoIndicado && (
          <CampoTexto id="iu-uro-motivo" rotulo="Motivo" editavel={editavel} valor={dados.urodinamica.motivo} onChange={(v) => set('urodinamica', { ...dados.urodinamica!, motivo: v })} />
        )}
      </fieldset>
      <DiarioCampo id="iu-diario" rotulo="Diário miccional" consultaId={consultaId} editavel={editavel} valor={dados.diarioMiccional}
        alertas={alertasModuloIU(dados)} onChange={(v) => set('diarioMiccional', v)} />
      <div className="space-y-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setMostrarAbsorvente((x) => !x)} aria-expanded={mostrarAbsorvente}>
          {mostrarAbsorvente ? 'Ocultar' : 'Mostrar'} teste do absorvente (opcional)
        </Button>
        {mostrarAbsorvente && (
          <fieldset className="space-y-2 rounded border border-dashed border-border p-2">
            <legend className="px-1 text-sm font-medium">Teste do absorvente</legend>
            <Aviso>{AVISOS_IU.testeAbsorvente}</Aviso>
            <div className="flex items-center gap-2">
              <Checkbox id="iu-abs" disabled={!editavel} checked={!!dados.testeAbsorvente?.realizado} onCheckedChange={(c) => set('testeAbsorvente', { ...dados.testeAbsorvente, realizado: !!c })} />
              <Label htmlFor="iu-abs">Realizado</Label>
            </div>
            {dados.testeAbsorvente?.realizado && (
              <div className="grid gap-2 sm:grid-cols-2">
                <CampoTexto id="iu-abs-prot" rotulo="Protocolo" editavel={editavel} valor={dados.testeAbsorvente.protocolo} onChange={(v) => set('testeAbsorvente', { ...dados.testeAbsorvente!, protocolo: v })} />
                <CampoTexto id="iu-abs-res" rotulo="Resultado" editavel={editavel} valor={dados.testeAbsorvente.resultado} onChange={(v) => set('testeAbsorvente', { ...dados.testeAbsorvente!, resultado: v })} />
              </div>
            )}
          </fieldset>
        )}
      </div>
    </div>
  );
}

function ModuloAnalCampos({ consultaId, dados, onChange, editavel }: Comum & { consultaId: string; dados: ModuloIncontinenciaAnal; onChange: (d: ModuloIncontinenciaAnal) => void }) {
  const set = <K extends keyof ModuloIncontinenciaAnal>(k: K, v: ModuloIncontinenciaAnal[K]) => onChange({ ...dados, [k]: v });
  const h = dados.historia ?? {};
  const alertas = alertasModuloIncontinenciaAnal(dados);
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {(['causa', 'fatoresRisco', 'duracao', 'gravidade'] as const).map((k) => (
          <CampoTexto key={k} id={`ia-h-${k}`} editavel={editavel} valor={h[k]} onChange={(v) => set('historia', { ...h, [k]: v })}
            rotulo={{ causa: 'Causa', fatoresRisco: 'Fatores de risco', duracao: 'Duração', gravidade: 'Gravidade (descrição)' }[k]} />
        ))}
      </div>
      <MultiOpcao rotulo="Tipo de perda" prefixo="ia-perda" editavel={editavel} valores={dados.tipoPerda} opcoes={TIPOS_PERDA_ANAL} onChange={(v) => set('tipoPerda', v as ModuloIncontinenciaAnal['tipoPerda'])} />
      <MultiOpcao rotulo="Subtipo" prefixo="ia-sub" editavel={editavel} valores={dados.subtipo} opcoes={SUBTIPOS_PERDA_ANAL} onChange={(v) => set('subtipo', v as ModuloIncontinenciaAnal['subtipo'])} />
      <div className="grid gap-2 sm:grid-cols-2">
        <Opcao rotulo="Consistência das fezes" editavel={editavel} valor={dados.consistenciaFezes?.consistencia} opcoes={CONSISTENCIAS_FEZES}
          onChange={(v) => set('consistenciaFezes', { ...dados.consistenciaFezes, consistencia: v as 'SOLIDA' | 'PASTOSA' | 'LIQUIDA' | undefined })} />
        <Opcao rotulo={dados.consistenciaFezes?.consistencia ? 'Informação dada por *' : 'Informação dada por'} editavel={editavel} valor={dados.consistenciaFezes?.origemInformacao} opcoes={ORIGENS_INFORMACAO}
          onChange={(v) => set('consistenciaFezes', { ...dados.consistenciaFezes, origemInformacao: v as 'PACIENTE' | 'PROFISSIONAL' | undefined })} />
      </div>
      <div className="space-y-2">
        <div className="text-sm font-medium">Exame físico</div>
        <ItemExameCampo id="ia-ef-insp" rotulo={r('inspecaoPerianal')} editavel={editavel} valor={dados.exameFisico?.inspecaoPerianal} onChange={(v) => set('exameFisico', { ...dados.exameFisico, inspecaoPerianal: v })} />
        <ItemExameCampo id="ia-ef-retal" rotulo={r('retalDigital')} editavel={editavel} valor={dados.exameFisico?.retalDigital} aviso={AVISOS_ANAL.toqueCompetencia}
          onChange={(v) => set('exameFisico', { ...dados.exameFisico, retalDigital: v })} />
      </div>
      <MultiOpcao rotulo="Sinais de alarme" prefixo="ia-alarme" editavel={editavel} valores={dados.sinaisAlarme} opcoes={SINAIS_ALARME_ANAL} onChange={(v) => set('sinaisAlarme', v as ModuloIncontinenciaAnal['sinaisAlarme'])} />
      {alertas.map((a) => <Aviso key={a}>{a}</Aviso>)}
      <DiarioCampo id="ia-diario" rotulo="Diário intestinal" consultaId={consultaId} editavel={editavel} valor={dados.diarioIntestinal} alertas={[]} onChange={(v) => set('diarioIntestinal', v)} />
    </div>
  );
}

export function ModulosAvaliacao({
  consultaId, pacienteId = '', modulos, onChange, editavel, classificacoes,
}: { consultaId: string; pacienteId?: string; modulos: ModuloForm[]; onChange: (m: ModuloForm[]) => void; editavel: boolean; classificacoes: string[] }) {
  const [escolhendo, setEscolhendo] = useState(false);
  const presentes = new Set(modulos.map((m) => m.area));
  const disponiveis = modulosDisponiveis(classificacoes as ClassificacaoAreaShared[]).filter((a) => !presentes.has(a));
  const atualizar = (area: AreaModuloAvaliacao, dados: Record<string, unknown>) => onChange(modulos.map((m) => (m.area === area ? { area, dados } : m)));

  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border p-3" data-testid="modulos-avaliacao">
      <div className="flex items-center gap-2">
        <div className="flex-1 text-sm font-medium">Módulos da avaliação</div>
        {editavel && disponiveis.length > 0 && (
          <Button type="button" size="sm" variant="outline" onClick={() => setEscolhendo((x) => !x)}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar módulo
          </Button>
        )}
      </div>
      {escolhendo && editavel && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Módulos disponíveis">
          {disponiveis.map((a) => (
            <Button key={a} type="button" size="sm" onClick={() => { onChange([...modulos, { area: a, dados: {} }]); setEscolhendo(false); }}>
              {NOME_MODULO[a] ?? a}
            </Button>
          ))}
        </div>
      )}
      {modulos.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {editavel && disponiveis.length === 0 ? 'Nenhum módulo de avaliação disponível para a classificação deste paciente.' : 'Nenhum módulo adicionado.'}
        </p>
      )}
      {modulos.map((m) => (
        <details key={m.area} open className="rounded-lg border border-border p-3">
          <summary className="flex cursor-pointer items-center gap-2 font-medium">
            <span className="flex-1">{NOME_MODULO[m.area] ?? m.area}</span>
            {editavel && (
              <Button type="button" variant="ghost" size="icon" aria-label={`Remover módulo ${NOME_MODULO[m.area] ?? m.area}`}
                onClick={(e) => { e.preventDefault(); onChange(modulos.filter((x) => x.area !== m.area)); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </summary>
          <div className="pt-3">
            {m.area === AreaModuloAvaliacao.IU && (
              <ModuloIUCampos consultaId={consultaId} editavel={editavel} dados={m.dados as ModuloIU} onChange={(d) => atualizar(m.area, d as Record<string, unknown>)} />
            )}
            {m.area === AreaModuloAvaliacao.INCONTINENCIA_ANAL && (
              <ModuloAnalCampos consultaId={consultaId} editavel={editavel} dados={m.dados as ModuloIncontinenciaAnal} onChange={(d) => atualizar(m.area, d as Record<string, unknown>)} />
            )}
            {m.area === AreaModuloAvaliacao.FERIDA && (
              <ModuloFeridaCampos consultaId={consultaId} pacienteId={pacienteId} editavel={editavel} dados={m.dados as ModuloFerida} onChange={(d) => atualizar(m.area, d as Record<string, unknown>)} />
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
