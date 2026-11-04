import { formatarDocumentoFiscal, TipoDocumentoFiscal } from '@/lib/documento-fiscal';

/** Documento da clínica na lista do super-admin: formatado, ou "Documento pendente" (clínica criada sem CPF/CNPJ). */
export function rotuloDocumentoClinica(tipo: string, documento?: string | null): string {
  const d = documento?.trim();
  return d ? formatarDocumentoFiscal(tipo as TipoDocumentoFiscal, d) : 'Documento pendente';
}
