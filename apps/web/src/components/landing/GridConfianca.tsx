import { motion } from 'framer-motion';
import { Cloud, KeyRound, LockKeyhole, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Fundo, cascata, naViewport, subir } from './fundo';

// Só recursos existentes e verificados no produto. Qualquer afirmação técnica nova
// (backup, latência, selos de conformidade etc.) precisa ser confirmada antes.
const cartoes: {
  fundo: 'cifragem' | 'doisFatores' | 'nuvem';
  icone: LucideIcon;
  titulo: string;
  texto: string;
  /** Classes do cartão (grade), do fundo e do bloco de texto (posição sobre o fundo). */
  cartao: string;
  fundoPos: string;
  textoPos: string;
}[] = [
  {
    fundo: 'nuvem',
    icone: Cloud,
    titulo: 'Na nuvem, sem instalação',
    texto: 'Acesse direto pelo navegador, sem instalar nada no computador.',
    cartao: 'sm:col-span-2',
    // No celular o cartão é estreito e o texto cairia sobre a fumaça clara (contraste
    // medido ~1,4:1): empilha imagem em cima e texto embaixo. Do sm em diante, texto na metade esquerda.
    fundoPos: 'absolute inset-0',
    textoPos: 'relative',
  },
  {
    fundo: 'cifragem',
    icone: LockKeyhole,
    titulo: 'Dados sensíveis cifrados',
    texto: 'Os dados sensíveis dos pacientes ficam cifrados em repouso, com AES-256-GCM.',
    // Altura calibrada para o desenho do fundo não invadir o terço inferior (texto).
    cartao: '',
    fundoPos: 'absolute inset-0',
    textoPos: 'relative',
  },
  {
    fundo: 'doisFatores',
    icone: KeyRound,
    titulo: 'Autenticação em dois fatores',
    texto: 'Além da senha, um código temporário (TOTP) do seu app autenticador.',
    cartao: '',
    fundoPos: 'absolute inset-0',
    textoPos: 'relative',
  },
];

export function GridConfianca() {
  return (
    <section aria-labelledby="confianca-titulo" className="faixa-clara px-6 py-24">
      <motion.div className="mx-auto max-w-6xl" variants={cascata} initial="hidden" whileInView="show" viewport={naViewport}>
        <motion.h2
          id="confianca-titulo"
          variants={subir}
          className="max-w-xl font-display text-3xl font-extrabold leading-tight tracking-[-0.02em] text-navy-800 sm:text-4xl"
        >
          Segurança desde o primeiro acesso
        </motion.h2>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {cartoes.map(({ fundo, icone: Icone, titulo, texto, cartao, fundoPos, textoPos }) => (
            <motion.li
              key={titulo}
              variants={subir}
              // Hover via framer: o transform inline da entrada anularia um translate de classe CSS.
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
              className={cn(
                'relative isolate overflow-hidden rounded-[22px] border border-l-[3px] border-navy-800/10 border-l-ambar bg-white shadow-[0_20px_50px_rgba(8,31,69,0.12)] transition-colors duration-300',
                cartao,
              )}
            >
              <div className={cn('-z-10', fundoPos)}>
                <Fundo nome={fundo} />
              </div>
              <div className={cn('p-6', textoPos)}>
                <Icone className="h-6 w-6 text-navy-600" strokeWidth={1.6} aria-hidden="true" />
                <h3 className="mt-4 text-lg font-extrabold tracking-[-0.01em] text-navy-800">{titulo}</h3>
                <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-claro-2">{texto}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}
