import { EmissaoComparecimento } from '@/components/EmissaoComparecimento';
import { DocumentoAssinatura } from '@/components/DocumentoAssinatura';
import { documentosEmitidosApi } from '@/api/resources';

/**
 * Atestado de comparecimento (clínico, privativo do psicólogo). A data e o horário vêm de um atendimento
 * CONCLUÍDO na agenda e o texto é montado pelo SERVIDOR; não há campo de data digitável.
 */
export function AtestadoComparecimentoPage() {
  return (
    <EmissaoComparecimento
      titulo="Atestado de Comparecimento"
      rotuloBotao="Gerar atestado"
      corpoTestId="atestado-corpo"
      emitir={documentosEmitidosApi.atestadoComparecimento}
      renderAssinatura={(doc) => <DocumentoAssinatura emissor={doc.emissor} />}
    />
  );
}
