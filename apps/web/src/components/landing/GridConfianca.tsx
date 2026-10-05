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
    cartao: 'sm:col-span-2 sm:min-h-80',
    // No celular o cartão é estreito e o texto cairia sobre a fumaça clara (contraste
    // medido ~1,4:1): empilha imagem em cima e texto embaixo. Do sm em diante, texto na metade esquerda.
    fundoPos: 'relative h-44 sm:absolute sm:inset-0 sm:h-auto',
    textoPos: 'relative sm:absolute sm:inset-y-0 sm:left-0 sm:flex sm:w-1/2 sm:flex-col sm:justify-center',
  },
  {
    fundo: 'cifragem',
    icone: LockKeyhole,
    titulo: 'Dados sensíveis cifrados',
    texto: 'Os dados sensíveis dos pacientes ficam cifrados em repouso, com AES-256-GCM.',
    // Altura calibrada para o desenho do fundo não invadir o terço inferior (texto).
    cartao: 'aspect-[4/5] sm:aspect-auto sm:min-h-[27.5rem]',
    fundoPos: 'absolute inset-0',
    textoPos: 'absolute bottom-0 left-0 w-full',
  },
  {
    fundo: 'doisFatores',
    icone: KeyRound,
    titulo: 'Autenticação em dois fatores',
    texto: 'Além da senha, um código temporário (TOTP) do seu app autenticador.',
    cartao: 'aspect-[4/5] sm:aspect-auto sm:min-h-[27.5rem]',
    fundoPos: 'absolute inset-0',
    textoPos: 'absolute bottom-0 left-0 w-full',
  },
];

export function GridConfianca() {
  return (
    <section aria-labelledby="confianca-titulo" className="bg-noite px-6 pb-24 pt-4 text-quente">
      <motion.div className="mx-auto max-w-6xl" variants={cascata} initial="hidden" whileInView="show" viewport={naViewport}>
        <motion.h2
          id="confianca-titulo"
          variants={subir}
          className="max-w-xl font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl"
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
                'relative isolate overflow-hidden rounded-2xl border border-white/10 bg-noite transition-colors duration-300 hover:border-turquesa/40',
                cartao,
              )}
            >
              <div className={cn('-z-10', fundoPos)}>
                <Fundo nome={fundo} />
              </div>
              <div className={cn('p-6', textoPos)}>
                <Icone className="h-6 w-6 text-turquesa" strokeWidth={1.6} aria-hidden="true" />
                <h3 className="mt-4 text-lg font-semibold tracking-tight">{titulo}</h3>
                <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-quente/80">{texto}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}
