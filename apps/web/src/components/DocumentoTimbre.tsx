import { brand } from '@/lib/brand';

/**
 * Timbre (cabeçalho) padrão da Nuvita para documentos impressos / gerados em PDF.
 * Logo oficial à esquerda e dados cadastrais à direita.
 */
export function DocumentoTimbre() {
  return (
    <header className="flex items-start justify-between gap-4 mb-5 pb-4 border-b border-gray-300">
      <img src={brand.logo.color} alt={`${brand.nome} — ${brand.slogan}`} className="h-12 w-auto" />
      <div className="text-right text-[10px] leading-snug text-gray-600">
        <p className="font-semibold text-gray-800">{brand.nome} — {brand.slogan}</p>
        <p>CNPJ {brand.cnpj}</p>
        <p>{brand.endereco}</p>
        <p>{brand.telefone}</p>
      </div>
    </header>
  );
}

/**
 * Rodapé padrão para documentos impressos / PDF, com a identificação da Nuvita.
 */
export function DocumentoRodape() {
  return (
    <footer className="mt-10 pt-3 border-t border-gray-300 text-center text-[9px] text-gray-500 leading-snug">
      <p>
        {brand.nome} · {brand.slogan} · CNPJ {brand.cnpj}
      </p>
      <p>
        {brand.endereco} · {brand.telefone}
      </p>
    </footer>
  );
}
