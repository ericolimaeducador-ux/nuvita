import { useClinicaMinha } from '@/lib/useClinicaMinha';
import { documentoRotulado, enderecoEmLinha, preenchido } from '@/lib/timbre';

/**
 * Timbre (cabeçalho) dos documentos impressos / PDF: identifica a CLÍNICA emissora com os dados de
 * GET /clinicas/minha. Sem logo cadastrado vira cabeçalho textual com o nome da clínica; nunca
 * mostra a marca do produto. Campo vazio não gera linha nem rótulo.
 */
export function DocumentoTimbre() {
  const { data: clinica, isError } = useClinicaMinha();
  if (!clinica) {
    return (
      <header className="mb-5 pb-4 border-b border-gray-300 min-h-12">
        {isError && (
          <p className="print:hidden text-xs text-red-600">Não foi possível carregar os dados da clínica.</p>
        )}
      </header>
    );
  }

  const logoUrl = preenchido(clinica.logoUrl);
  const telefone = preenchido(clinica.telefone);
  const email = preenchido(clinica.emailContato);
  const linhas = [
    documentoRotulado(clinica),
    enderecoEmLinha(clinica.endereco),
    telefone && `Tel: ${telefone}`,
    email && `E-mail: ${email}`,
  ].filter((l): l is string => !!l);

  return (
    <header className="flex items-start justify-between gap-4 mb-5 pb-4 border-b border-gray-300">
      {logoUrl ? (
        <img src={logoUrl} alt={clinica.nome} className="max-h-16 max-w-48 object-contain" />
      ) : (
        <h2 className="text-lg font-bold text-gray-900 leading-tight">{clinica.nome}</h2>
      )}
      <div className="text-right text-[10px] leading-snug text-gray-600">
        {logoUrl && <p className="font-semibold text-gray-800">{clinica.nome}</p>}
        {linhas.map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
    </header>
  );
}

/** Rodapé dos documentos impressos / PDF: identificação da clínica emissora. */
export function DocumentoRodape() {
  const { data: clinica } = useClinicaMinha();
  if (!clinica) return <footer className="mt-10" />;

  const linha1 = [clinica.nome, documentoRotulado(clinica)].filter(Boolean).join(' · ');
  const tel = preenchido(clinica.telefone);
  const email = preenchido(clinica.emailContato);
  const linha2 = [enderecoEmLinha(clinica.endereco), tel && `Tel: ${tel}`, email && `E-mail: ${email}`]
    .filter(Boolean)
    .join(' · ');

  return (
    <footer className="mt-10 pt-3 border-t border-gray-300 text-center text-[9px] text-gray-500 leading-snug">
      <p>{linha1}</p>
      {linha2 && <p>{linha2}</p>}
    </footer>
  );
}
