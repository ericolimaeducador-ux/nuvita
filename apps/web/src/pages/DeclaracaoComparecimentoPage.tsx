import { EmissaoComparecimento } from '@/components/EmissaoComparecimento';
import { documentosEmitidosApi } from '@/api/resources';

/**
 * Declaração de comparecimento: documento ADMINISTRATIVO que a secretária emite. Afirma só a PRESENÇA
 * na clínica, sem dizer que houve atendimento psicológico (isso é do atestado clínico, privativo do
 * enfermeiro). O SERVIDOR monta o texto e a data/hora a partir de um atendimento concluído na agenda.
 */
export function DeclaracaoComparecimentoPage() {
  return (
    <EmissaoComparecimento
      titulo="Declaração de Comparecimento"
      rotuloBotao="Gerar declaração"
      corpoTestId="declaracao-corpo"
      emitir={documentosEmitidosApi.declaracaoComparecimento}
      renderAssinatura={(doc) => (
        <div className="mt-16 flex flex-col items-center gap-1 text-sm" data-testid="assinatura-declaracao">
          <p>_____________________________________</p>
          <p className="font-semibold">{doc.clinica.nome}</p>
          <p>{doc.emissor.nome}</p>
        </div>
      )}
    />
  );
}
