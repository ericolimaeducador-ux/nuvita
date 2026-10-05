import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import { DocumentoClinicoLayout } from '@/components/DocumentoClinicoLayout';
import { DocumentoAssinatura } from '@/components/DocumentoAssinatura';
import { pacientesApi, prontuariosApi } from '@/api/resources';
import { toItems } from '@/utils';
import { ErroConsulta } from '@/components/ErroConsulta';
import { primeiraFalha } from '@/lib/consulta';
import { TipoAtendimento, type Prontuario } from '@/types';

/** Último valor não-vazio de um campo, das sessões mais recentes para as mais antigas. */
function ultimoValor(sessoes: Prontuario[], campo: keyof NonNullable<Prontuario['registroPsicologico']>): string | undefined {
  for (let i = sessoes.length - 1; i >= 0; i--) {
    const v = sessoes[i].registroPsicologico?.[campo];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return undefined;
}

function montarRascunho(sessoes: Prontuario[]): string {
  if (sessoes.length === 0) return '';
  const primeira = sessoes[0];
  const motivo = primeira.registroPsicologico?.motivoAtendimento;
  const diagnosticos = ultimoValor(sessoes, 'diagnosticosSaudeMental');
  const objetivos = ultimoValor(sessoes, 'objetivosTrabalho');
  const evolucoes = sessoes
    .slice(-3)
    .map((s) => s.registroPsicologico?.evolucao)
    .filter((v): v is string => !!v?.trim());

  const partes: string[] = [];
  if (motivo) partes.push(`Motivo do encaminhamento/atendimento: ${motivo}`);
  if (diagnosticos) partes.push(`Diagnósticos/hipóteses de saúde mental: ${diagnosticos}`);
  partes.push(`O paciente está em acompanhamento psicoterápico desde ${dayjs(primeira.dataAtendimento).format('DD/MM/YYYY')}, totalizando ${sessoes.length} sessão(ões) registrada(s).`);
  if (evolucoes.length) partes.push(`Evolução observada: ${evolucoes.join(' ')}`);
  if (objetivos) partes.push(`Objetivos do acompanhamento: ${objetivos}`);

  return partes.join('\n\n');
}

export function LaudoPsicoterapicoPage() {
  const { id: pacienteId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [modo, setModo] = useState<'compor' | 'imprimir'>('compor');
  const [texto, setTexto] = useState('');
  const [rascunhoAplicado, setRascunhoAplicado] = useState(false);

  const pacienteQ = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => pacientesApi.get(pacienteId!),
    enabled: !!pacienteId,
  });
  const sessoesQ = useQuery({
    queryKey: ['sessoes-psicologia', pacienteId],
    queryFn: () => prontuariosApi.list({ pacienteId: pacienteId! }),
    enabled: !!pacienteId,
  });
  const sessoes = toItems<Prontuario>(sessoesQ.data)
    .filter((p) => p.tipo === TipoAtendimento.PSICOTERAPIA)
    .sort((a, b) => dayjs(a.dataAtendimento).valueOf() - dayjs(b.dataAtendimento).valueOf());

  useEffect(() => {
    // Em erro o rascunho não pode ser "gasto" com histórico vazio: espera o retry dar certo.
    if (rascunhoAplicado || sessoesQ.isLoading || sessoesQ.isError) return;
    setTexto(montarRascunho(sessoes));
    setRascunhoAplicado(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessoesQ.isLoading, sessoesQ.isError]);

  const paciente = pacienteQ.data;
  const carregando = pacienteQ.isLoading || sessoesQ.isLoading;
  // Sem paciente e histórico não se emite documento: nada de nome em branco nem de histórico vazio.
  const falha = primeiraFalha(pacienteQ, sessoesQ);

  if (modo === 'imprimir' && !falha) {
    return (
      <DocumentoClinicoLayout rotulo="Laudo Psicoterápico" onVoltar={() => setModo('compor')}>
        <div className="flex items-center justify-between border-b-2 border-gray-800 pb-4 mb-6">
          <h1 className="text-base font-bold uppercase tracking-wide">Laudo Psicoterápico</h1>
          <p className="text-xs text-gray-500">Emitido em {dayjs().format('DD/MM/YYYY')}</p>
        </div>

        <p className="text-xs text-gray-500 mb-4">Paciente: <strong className="text-gray-800">{paciente?.nome}</strong></p>

        <p className="whitespace-pre-wrap leading-relaxed">{texto}</p>

        <DocumentoAssinatura />
      </DocumentoClinicoLayout>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title="Laudo Psicoterápico"
        subtitle={paciente ? `Paciente: ${paciente.nome}` : falha ? 'Dados indisponíveis' : 'Carregando…'}
        extra={
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        }
      />

      {carregando ? (
        <Skeleton className="h-64 w-full" />
      ) : falha ? (
        <ErroConsulta erro={falha.error} refetch={falha.refetch} recurso="os dados do paciente e o histórico de sessões" />
      ) : (
        <Card>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Rascunho gerado a partir do histórico de sessões — revise e edite livremente antes de emitir.
            </p>
            <div className="space-y-2">
              <Label htmlFor="laudoTexto">Texto do laudo</Label>
              <Textarea id="laudoTexto" rows={12} value={texto} onChange={(e) => setTexto(e.target.value)} />
            </div>

            <Button onClick={() => setModo('imprimir')} disabled={!texto.trim()}>
              <FileText className="mr-2 h-4 w-4" /> Gerar laudo
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
