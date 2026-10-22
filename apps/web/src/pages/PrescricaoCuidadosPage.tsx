import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { ArrowLeft, Check, FileText, Sparkles, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import { DocumentoClinicoLayout } from '@/components/DocumentoClinicoLayout';
import { DocumentoAssinatura } from '@/components/DocumentoAssinatura';
import { toast } from '@/components/ui/use-toast';
import { ErroConsulta } from '@/components/ErroConsulta';
import { pacientesApi, iaClinicaApi } from '@/api/resources';
import { apiErrorMessage } from '@/api/client';
import { SUGESTOES_CUIDADOS_POR_LINHA } from '@/lib/linhaTerapeutica';
import { DecisaoUsoIA, LINHA_TERAPEUTICA_LABEL } from '@/types';

const CHECKLIST_FIXO = [
  'Exercícios de respiração/relaxamento',
  'Diário comportamental',
  'Leituras/filmes indicados',
  'Encaminhamento a outro profissional (se necessário)',
];

export function PrescricaoCuidadosPage() {
  const { id: pacienteId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [modo, setModo] = useState<'compor' | 'imprimir'>('compor');
  const [checklist, setChecklist] = useState<string[]>([]);
  const [textoLivre, setTextoLivre] = useState('');
  // Rascunho da IA aguardando decisão do psicólogo (null = sem sugestão pendente).
  const [sugestaoIa, setSugestaoIa] = useState<{ texto: string; registroUsoIaId: string } | null>(null);

  const pacienteQ = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => pacientesApi.get(pacienteId!),
    enabled: !!pacienteId,
  });
  const paciente = pacienteQ.data;
  // Sem o paciente não se emite prescrição (nome em branco, linha terapêutica ausente).
  const falha = pacienteQ.isError ? pacienteQ : null;
  const sugestoes = paciente?.linhaTerapeutica ? SUGESTOES_CUIDADOS_POR_LINHA[paciente.linhaTerapeutica] : [];

  function toggleChecklist(item: string) {
    setChecklist((cur) => (cur.includes(item) ? cur.filter((i) => i !== item) : [...cur, item]));
  }

  function adicionarSugestao(sugestao: string) {
    setTextoLivre((cur) => (cur.includes(sugestao) ? cur : cur ? `${cur}\n- ${sugestao}` : `- ${sugestao}`));
  }

  const gerarIaMut = useMutation({
    mutationFn: () =>
      iaClinicaApi.gerarPrescricao({
        linhaTerapeutica: paciente?.linhaTerapeutica,
        checklistSelecionado: checklist.length ? checklist : undefined,
        contextoClinico: textoLivre.trim() || undefined,
      }),
    onSuccess: (r) => setSugestaoIa({ texto: r.prescricao, registroUsoIaId: r.registroUsoIaId }),
    onError: (e) => toast.error('Erro ao gerar com IA', apiErrorMessage(e)),
  });

  const decisaoIaMut = useMutation({
    mutationFn: (decisao: DecisaoUsoIA) =>
      iaClinicaApi.registrarDecisao(sugestaoIa!.registroUsoIaId, decisao),
    onSuccess: (_r, decisao) => {
      if (decisao === DecisaoUsoIA.ACEITA && sugestaoIa) {
        setTextoLivre((cur) => (cur.trim() ? `${cur}\n\n${sugestaoIa.texto}` : sugestaoIa.texto));
      }
      setSugestaoIa(null);
      toast.success(
        decisao === DecisaoUsoIA.ACEITA ? 'Sugestão adicionada às orientações.' : 'Sugestão descartada.',
      );
    },
    onError: (e) => toast.error('Erro ao registrar a decisão', apiErrorMessage(e)),
  });

  if (modo === 'imprimir' && !falha) {
    return (
      <DocumentoClinicoLayout rotulo="Prescrição de Cuidados" onVoltar={() => setModo('compor')}>
        <div className="flex items-center justify-between border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-base font-bold uppercase tracking-wide">Prescrição de Cuidados em Psicologia</h1>
          <p className="text-xs text-gray-500">{dayjs().format('DD/MM/YYYY')}</p>
        </div>

        <p className="text-xs text-gray-500 mb-4">Paciente: <strong className="text-gray-800">{paciente?.nome}</strong></p>

        {checklist.length > 0 && (
          <ul className="list-disc list-inside space-y-1 mb-4">
            {checklist.map((item) => <li key={item}>{item}</li>)}
          </ul>
        )}

        {textoLivre.trim() && (
          <p className="whitespace-pre-wrap leading-relaxed">{textoLivre}</p>
        )}

        <DocumentoAssinatura />
      </DocumentoClinicoLayout>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title="Prescrição de Cuidados em Psicologia"
        subtitle={paciente ? `Paciente: ${paciente.nome}` : falha ? 'Dados indisponíveis' : 'Carregando…'}
        extra={
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        }
      />

      {pacienteQ.isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : falha ? (
        <ErroConsulta erro={falha.error} refetch={falha.refetch} recurso="os dados do paciente" />
      ) : (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label>Checklist de cuidados</Label>
              <div className="space-y-2">
                {CHECKLIST_FIXO.map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <Checkbox
                      id={`chk-${item}`}
                      checked={checklist.includes(item)}
                      onCheckedChange={() => toggleChecklist(item)}
                    />
                    <Label htmlFor={`chk-${item}`} className="cursor-pointer font-normal">{item}</Label>
                  </div>
                ))}
              </div>
            </div>

            {paciente?.linhaTerapeutica && sugestoes.length > 0 && (
              <div className="space-y-2">
                <Label>Sugestões — {LINHA_TERAPEUTICA_LABEL[paciente.linhaTerapeutica]}</Label>
                <div className="flex flex-wrap gap-2">
                  {sugestoes.map((s) => (
                    <Badge key={s} variant="secondary" className="cursor-pointer" onClick={() => adicionarSugestao(s)}>
                      + {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="textoLivre">Orientações adicionais</Label>
                <Button
                  type="button" size="sm" variant="outline"
                  onClick={() => gerarIaMut.mutate()} disabled={gerarIaMut.isPending}
                >
                  {gerarIaMut.isPending ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-3.5 w-3.5" />
                  )}
                  Gerar com IA
                </Button>
              </div>
              <Textarea
                id="textoLivre" rows={8} value={textoLivre} onChange={(e) => setTextoLivre(e.target.value)}
                placeholder="Clique nas sugestões acima para adicionar, escreva livremente, ou gere um rascunho com IA."
              />
              <p className="text-xs text-muted-foreground">
                A sugestão da IA é um rascunho — revise antes de imprimir.
              </p>
            </div>

            {sugestaoIa && (
              <div className="rounded-xl border border-dashed bg-muted/20 p-4 space-y-2 text-sm">
                <Badge variant="outline" className="text-violet-600 border-violet-500/30">
                  <Sparkles className="h-3 w-3 mr-1" /> Gerado por IA
                </Badge>
                <p className="whitespace-pre-wrap text-foreground">{sugestaoIa.texto}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    type="button" variant="secondary" size="sm"
                    onClick={() => decisaoIaMut.mutate(DecisaoUsoIA.ACEITA)}
                    disabled={decisaoIaMut.isPending}
                  >
                    {decisaoIaMut.isPending
                      ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      : <Check className="mr-2 h-3.5 w-3.5" />}
                    Usar esta sugestão
                  </Button>
                  <Button
                    type="button" variant="ghost" size="sm"
                    onClick={() => decisaoIaMut.mutate(DecisaoUsoIA.DESCARTADA)}
                    disabled={decisaoIaMut.isPending}
                  >
                    <X className="mr-2 h-3.5 w-3.5" /> Descartar
                  </Button>
                </div>
              </div>
            )}

            <Button onClick={() => setModo('imprimir')} disabled={checklist.length === 0 && !textoLivre.trim()}>
              <FileText className="mr-2 h-4 w-4" /> Gerar prescrição
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
