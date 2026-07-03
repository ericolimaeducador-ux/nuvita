import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Printer, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { prontuariosApi, pacientesApi } from '@/api/resources';
import { DocumentoTimbre, DocumentoRodape } from '@/components/DocumentoTimbre';
import { formatCpf, formatData, idade } from '@/utils';
import type { Prontuario, RelatorioJudicial } from '@/types';

function marca(cond?: boolean): string {
  return cond ? '( X )' : '(    )';
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h2 className="text-xs font-bold uppercase text-gray-500 mb-1.5 border-b border-gray-300 pb-1">{titulo}</h2>
      <div className="text-sm leading-relaxed space-y-1">{children}</div>
    </section>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children?: React.ReactNode }) {
  return (
    <p>
      <span className="font-semibold">{rotulo}:</span>{' '}
      <span className="whitespace-pre-line">{children || '—'}</span>
    </p>
  );
}

function descricaoProduto(rj: RelatorioJudicial): string {
  if (!rj.produto) return '';
  return [
    rj.produto.descricao,
    rj.produto.calibreFrench && `calibre ${rj.produto.calibreFrench} Fr`,
    rj.produto.comprimentoCm && `comprimento ${rj.produto.comprimentoCm} cm`,
    rj.produto.quantidadePorDia && `${rj.produto.quantidadePorDia} unidades ao dia`,
    rj.produto.quantidadePorMes && `(${rj.produto.quantidadePorMes} unidades/mês)`,
    rj.produto.usoContinuo && 'uso contínuo',
  ].filter(Boolean).join(', ');
}

function descricaoMedicamento(rj: RelatorioJudicial): string {
  if (!rj.medicamento) return '';
  const m = rj.medicamento;
  return [m.principioAtivo, m.formaFarmaceuticaApresentacao, m.dose, m.posologia, m.viaAdministracao, m.duracaoTratamento]
    .filter(Boolean).join(' · ');
}

export function NatjusImpressaoPage() {
  const { id: pacienteId, prontuarioId } = useParams<{ id: string; prontuarioId: string }>();
  const navigate = useNavigate();

  const pacienteQ = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => pacientesApi.get(pacienteId!),
    enabled: !!pacienteId,
  });
  const prontQ = useQuery({
    queryKey: ['prontuario', prontuarioId],
    queryFn: () => prontuariosApi.get(prontuarioId!),
    enabled: !!prontuarioId,
  });

  if (prontQ.isLoading || pacienteQ.isLoading) {
    return <div className="p-8 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-48 w-full" /></div>;
  }

  const paciente = pacienteQ.data;
  const pr = prontQ.data as Prontuario | undefined;
  const rj = pr?.relatorioJudicial;

  if (!pr || !rj) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-lg font-semibold">Este atendimento não tem ficha de judicialização (NAT-JUS) preenchida.</p>
        <Button onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  const emissao = rj.dataEmissao ? dayjs(rj.dataEmissao) : dayjs(pr.dataAtendimento);
  const validade = emissao.add(90, 'day');
  const naturezaSus = rj.naturezaAtendimento === 'sus';
  const naturezaSup = rj.naturezaAtendimento === 'suplementar';
  const naturezaPart = rj.naturezaAtendimento === 'particular';

  return (
    <>
      <div className="print:hidden flex items-center gap-3 p-4 border-b border-white/5">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Prévia — Relatório NAT-JUS</span>
        <Button size="sm" className="ml-auto" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Imprimir / Salvar PDF
        </Button>
      </div>

      <div className="natjus-print max-w-3xl mx-auto p-8 text-gray-900 bg-white min-h-screen print:p-0 print:max-w-full">
        <DocumentoTimbre />

        <div className="text-center border-b-2 border-gray-800 pb-3 mb-5">
          <h1 className="text-lg font-bold uppercase tracking-wide">Anexo IV — Formulário de Solicitação de Informação Técnica ao NAT-JUS</h1>
          <p className="text-xs text-gray-600 mt-1">Relatório médico e receituário para demanda judicial de saúde</p>
        </div>

        <Secao titulo="I — Sobre o paciente">
          <Linha rotulo="Nome">{paciente?.nome}</Linha>
          <div className="grid grid-cols-2 gap-x-8">
            <Linha rotulo="Data de nascimento">{paciente?.dataNascimento ? `${formatData(paciente.dataNascimento)} (${idade(paciente.dataNascimento)})` : ''}</Linha>
            <Linha rotulo="CPF">{paciente?.cpf ? formatCpf(paciente.cpf) : ''}</Linha>
            <Linha rotulo="Sexo">{paciente?.sexo}</Linha>
            {pr.objetivo?.sinaisVitais?.peso && <Linha rotulo="Peso">{pr.objetivo.sinaisVitais.peso} kg</Linha>}
          </div>
        </Secao>

        <Secao titulo="II — Sobre o atendimento">
          <Linha rotulo="Município/Estado">{rj.municipioEstado}</Linha>
          <p>
            <span className="font-semibold">Natureza:</span>{' '}
            {marca(naturezaSus)} Saúde Pública (SUS){'   '}
            {marca(naturezaSup)} Saúde Suplementar{'   '}
            {marca(naturezaPart)} Particular
          </p>
        </Secao>

        <Secao titulo="III — Sobre a enfermidade">
          <Linha rotulo="Enfermidade / CID">{rj.enfermidadeCid}</Linha>
          <Linha rotulo="Histórico da doença">{rj.historicoDoenca}</Linha>
          <Linha rotulo="Tratamentos já realizados / resultado">{rj.tratamentosRealizados}</Linha>
        </Secao>

        <Secao titulo="IV — Solicitação">
          <p>
            {marca(rj.tipoSolicitacao === 'medicamento')} Medicamento{'   '}
            {marca(rj.tipoSolicitacao === 'produto')} Produto{'   '}
            {marca(rj.tipoSolicitacao === 'procedimento')} Procedimento
          </p>
          {rj.tipoSolicitacao === 'produto' && <Linha rotulo="Descrição">{descricaoProduto(rj)}</Linha>}
          {rj.tipoSolicitacao === 'medicamento' && <Linha rotulo="Descrição">{descricaoMedicamento(rj)}</Linha>}
          {rj.tipoSolicitacao === 'procedimento' && <Linha rotulo="Descrição">{rj.procedimentoDescricao}</Linha>}
        </Secao>

        <Secao titulo="V — Sobre a necessidade percebida do tratamento">
          <p><span className="font-semibold">É urgente:</span> {marca(rj.urgente)} Sim {marca(rj.urgente === false)} Não {rj.justificativaUrgencia ? `— ${rj.justificativaUrgencia}` : ''}</p>
          <p><span className="font-semibold">É imprescindível:</span> {marca(rj.imprescindivel)} Sim {marca(rj.imprescindivel === false)} Não {rj.justificativaImprescindivel ? `— ${rj.justificativaImprescindivel}` : ''}</p>
          <Linha rotulo="Benefícios esperados">{rj.beneficiosEsperados}</Linha>
          <Linha rotulo="Consequências da não utilização">{rj.consequenciasNaoUso}</Linha>
        </Secao>

        {rj.tipoSolicitacao === 'medicamento' && rj.medicamento && (
          <Secao titulo="Receituário">
            <Linha rotulo="Princípio ativo (DCB/DCI)">{rj.medicamento.principioAtivo}</Linha>
            <Linha rotulo="Forma farmacêutica e apresentação">{rj.medicamento.formaFarmaceuticaApresentacao}</Linha>
            <Linha rotulo="Dose / posologia">{[rj.medicamento.dose, rj.medicamento.posologia].filter(Boolean).join(' — ')}</Linha>
            <Linha rotulo="Via de administração">{rj.medicamento.viaAdministracao}</Linha>
            <Linha rotulo="Duração do tratamento">{rj.medicamento.duracaoTratamento}</Linha>
          </Secao>
        )}

        <div className="text-xs text-gray-600 border border-gray-300 rounded p-2 mb-6">
          <p><span className="font-semibold">Emissão:</span> {emissao.format('DD/MM/YYYY')} · <span className="font-semibold">Validade (90 dias):</span> {validade.format('DD/MM/YYYY')}</p>
          <p className="mt-0.5">Documento válido por até 90 dias da emissão, conforme exigência do NAT-JUS/SP.</p>
        </div>

        <div className="mt-14 flex justify-between items-end">
          <div className="text-center min-w-64">
            {pr.assinado && (
              <div className="border border-gray-400 rounded px-3 py-1 text-xs text-gray-600 mb-2 inline-block">
                ✓ Prontuário assinado digitalmente em {pr.assinado.dataAssinatura ? dayjs(pr.assinado.dataAssinatura).format('DD/MM/YYYY HH:mm') : '—'}
              </div>
            )}
            <div className="border-t-2 border-gray-800 pt-1">
              <p className="text-sm font-semibold">{rj.prescritor?.nome || '___________________________'}</p>
              <p className="text-xs text-gray-600">
                {rj.prescritor?.registro || 'Registro profissional: ___________'}
                {rj.prescritor?.especialidade ? ` · ${rj.prescritor.especialidade}` : ''}
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-500 text-right">
            <p>Local e data:</p>
            <p>{rj.municipioEstado || '__________________'}, {emissao.format('DD/MM/YYYY')}</p>
          </div>
        </div>

        <DocumentoRodape />
      </div>

      <style>{`
        @media print {
          .natjus-print { color: #111 !important; background: white !important; }
          body { margin: 0; }
        }
      `}</style>
    </>
  );
}
