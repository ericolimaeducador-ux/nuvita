import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { PenLine, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { prontuariosApi } from '@/api/resources';
import { ErroConsulta } from '@/components/ErroConsulta';
import { RespostaInvalidaError } from '@/lib/consulta';
import { apiErrorMessage } from '@/api/client';
import { toast } from '@/components/ui/use-toast';
import { camposDoFormulario, formularioDoRegistro, linhaDoRegistro, rotuloDoCampo, ROTULO_FORMULARIO } from '@/lib/registroPsicologico';
import {
  TipoAtendimento, TIPO_ATENDIMENTO_LABEL, REGISTRO_PSICOLOGICO_CAMPOS,
  type Prontuario, type ExameSegmentar, type RegistroPsicologico,
} from '@/types';


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
/** Mesmos rótulos e mesma ordem do formulário e do PDF; o que ficou vazio no formulário usado aparece como "Não preenchido". */
function RegistroPsicologicoLeitura({ registro, formulario }: { registro: RegistroPsicologico; formulario: 'completo' | 'seguimento' }) {
  const lista = camposDoFormulario(formulario, linhaDoRegistro(registro));
  const listados = new Set<string>(lista.map((c) => c.key));
  const texto = (v: unknown) => (v === undefined || v === null || String(v).trim() === '' ? undefined : String(v));
  return (
    <>
      <p className="text-xs text-muted-foreground">Formulário: {ROTULO_FORMULARIO[formulario]}</p>
      {lista.map(({ key, label }) => (
        <Campo key={key} label={label}>{texto(registro[key]) ?? 'Não preenchido'}</Campo>
      ))}
      {/* Conteúdo gravado fora do formulário usado (ex.: COREN digitado em registro antigo) nunca é escondido. */}
      {REGISTRO_PSICOLOGICO_CAMPOS.filter(([key]) => !listados.has(key) && texto(registro[key]) !== undefined).map(([key]) => (
        <Campo key={key} label={rotuloDoCampo(key)}>{texto(registro[key])}</Campo>
      ))}
    </>
  );
}

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
  const [confirmandoAssinatura, setConfirmandoAssinatura] = useState(false);
  const q = useQuery({
    queryKey: ['prontuario', prontuarioId],
    queryFn: () => prontuariosApi.get(prontuarioId!),
    enabled: !!prontuarioId && open,
  });
  const assinarMut = useMutation({
    mutationFn: () => prontuariosApi.assinar(prontuarioId!),
    onSuccess: () => {
      toast.success('Prontuário assinado.');
      setConfirmandoAssinatura(false);
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

  return (
    <>
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
        ) : !pr || q.isError ? (
          <ErroConsulta erro={q.error ?? new RespostaInvalidaError()} refetch={q.refetch} recurso="o prontuário" />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 glass rounded-xl p-4">
              <Campo label="Data do atendimento">{pr.dataAtendimento ? dayjs(pr.dataAtendimento).format('DD/MM/YYYY HH:mm') : '—'}</Campo>
              <Campo label="Tipo">{TIPO_ATENDIMENTO_LABEL[pr.tipo] ?? pr.tipo}</Campo>
              {pr.assinado?.dataAssinatura && (
                <Campo label="Assinado em">{dayjs(pr.assinado.dataAssinatura).format('DD/MM/YYYY HH:mm')}</Campo>
              )}
            </div>

            {pr.tipo === TipoAtendimento.PSICOTERAPIA && pr.registroPsicologico && (
              <div className="glass rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Registro de atendimento psicológico
                </p>
                <RegistroPsicologicoLeitura registro={pr.registroPsicologico} formulario={formularioDoRegistro(pr)} />
              </div>
            )}

            {pr.tipo !== TipoAtendimento.PSICOTERAPIA && (
            <>
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
            </>
            )}
          </div>
        )}

        <DialogFooter>
          {pr && pacienteId && (
            <Button variant="outline" onClick={() => navigate(`/pacientes/${pacienteId}/prontuario/${pr.id}/imprimir`)}>
              <FileText className="mr-2 h-4 w-4" /> Imprimir
            </Button>
          )}
          {pr && !pr.assinado && (
            <Button variant="outline" disabled={assinarMut.isPending} onClick={() => setConfirmandoAssinatura(true)}>
              <PenLine className="mr-2 h-4 w-4" /> {assinarMut.isPending ? 'Assinando...' : 'Assinar prontuário'}
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={confirmandoAssinatura} onOpenChange={(o) => { if (!o) setConfirmandoAssinatura(false); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assinar prontuário</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Depois de assinado, este prontuário não pode mais ser editado — qualquer
          correção exigirá um addendum.
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setConfirmandoAssinatura(false)} disabled={assinarMut.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => assinarMut.mutate()} disabled={assinarMut.isPending}>
            <PenLine className="mr-2 h-4 w-4" /> {assinarMut.isPending ? 'Assinando...' : 'Assinar prontuário'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
