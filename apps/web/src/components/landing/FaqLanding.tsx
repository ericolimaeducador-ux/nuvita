import { useRef, useState, type KeyboardEvent } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Pergunta { p: string; r: string }
interface Categoria { id: string; nome: string; itens: Pergunta[] }

const categorias: Categoria[] = [
  {
    id: 'assinatura',
    nome: 'Assinatura e planos',
    itens: [
      {
        p: 'Como funciona a garantia de 14 dias?',
        r: 'Você tem 14 dias corridos, contados da confirmação do pagamento, para cancelar e receber a devolução integral (100%) do valor pago, sem precisar justificar. Após esse prazo, valem as regras de vigência e fidelidade previstas nos Termos de Uso.',
      },
      {
        p: 'Existe fidelidade?',
        r: 'A assinatura tem vigência anual e é renovada automaticamente ao fim de cada ciclo, salvo cancelamento prévio. No pagamento parcelado (12x sem juros) há fidelidade de 12 meses; no pagamento à vista não há fidelidade. Os detalhes estão na cláusula 3 dos Termos de Uso.',
      },
      {
        p: 'Quanto tempo leva para meu acesso ser liberado?',
        r: 'Até 24 horas úteis após a confirmação do pagamento.',
      },
    ],
  },
  {
    id: 'pagamento',
    nome: 'Pagamento',
    itens: [
      {
        p: 'Quais são as formas de pagamento?',
        r: 'À vista no Pix ou no débito, ou no cartão de crédito parcelado.',
      },
      {
        p: 'Como funciona o parcelamento?',
        r: 'No cartão de crédito você parcela em até 12x sem juros. No parcelamento há fidelidade de 12 meses; no pagamento à vista, não.',
      },
    ],
  },
  {
    id: 'seguranca',
    nome: 'Segurança e dados',
    itens: [
      {
        p: 'Meus dados estão seguros?',
        r: 'Os dados são protegidos com criptografia e tratados em conformidade com a LGPD. O detalhe completo está na Política de Privacidade.',
      },
      {
        p: 'Quem é responsável pelos dados dos meus pacientes?',
        r: 'Você. Os dados dos pacientes que você cadastra são de sua responsabilidade como Controlador; a Nuvita atua como Operadora e os trata apenas para operar o serviço, conforme suas instruções.',
      },
    ],
  },
];

// Abas por categoria (WAI-ARIA tabs, com setas/Home/End); dentro de cada aba, acordeão de um item por vez.
export function FaqLanding() {
  const [aba, setAba] = useState(0);
  const [aberto, setAberto] = useState<number | null>(null);
  const abasRef = useRef<(HTMLButtonElement | null)[]>([]);

  function trocarAba(i: number) {
    setAba(i);
    setAberto(null);
    abasRef.current[i]?.focus();
  }

  function aoTeclar(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const n = categorias.length;
    if (e.key === 'ArrowRight') trocarAba((i + 1) % n);
    else if (e.key === 'ArrowLeft') trocarAba((i - 1 + n) % n);
    else if (e.key === 'Home') trocarAba(0);
    else if (e.key === 'End') trocarAba(n - 1);
    else return;
    e.preventDefault();
  }

  const atual = categorias[aba];

  return (
    <section id="faq" className="scroll-mt-16 bg-quente px-6 py-24">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.7fr] lg:gap-20">
        <div>
          <h2 className="font-display text-4xl font-medium leading-tight text-petroleo sm:text-5xl">Perguntas frequentes</h2>
          <p className="mt-3 max-w-sm text-muted-foreground">O essencial sobre assinatura, pagamento e dados.</p>
        </div>

        <div>
          <div role="tablist" aria-label="Categorias de perguntas" className="flex flex-wrap gap-x-7 gap-y-2 border-b border-sage/60">
            {categorias.map((c, i) => (
              <button
                key={c.id}
                ref={(el) => { abasRef.current[i] = el; }}
                type="button"
                role="tab"
                id={`faq-aba-${c.id}`}
                aria-selected={aba === i}
                aria-controls={`faq-painel-${c.id}`}
                tabIndex={aba === i ? 0 : -1}
                onClick={() => trocarAba(i)}
                onKeyDown={(e) => aoTeclar(e, i)}
                className={cn(
                  '-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petroleo-medio',
                  aba === i ? 'border-ouro text-petroleo' : 'border-transparent text-muted-foreground hover:text-petroleo',
                )}
              >
                {c.nome}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`faq-painel-${atual.id}`} aria-labelledby={`faq-aba-${atual.id}`}>
            {atual.itens.map((q, i) => {
              const isOpen = aberto === i;
              return (
                <div key={q.p} className="border-b border-sage/60">
                  <h3>
                    <button
                      type="button"
                      id={`faq-btn-${atual.id}-${i}`}
                      aria-expanded={isOpen}
                      aria-controls={`faq-resp-${atual.id}-${i}`}
                      onClick={() => setAberto(isOpen ? null : i)}
                      className="flex w-full items-center justify-between gap-6 py-5 text-left text-base font-semibold text-ink transition-colors hover:text-petroleo-medio focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petroleo-medio"
                    >
                      {q.p}
                      <Plus
                        className={cn('h-5 w-5 shrink-0 text-ouro transition-transform duration-200', isOpen && 'rotate-45')}
                        aria-hidden="true"
                      />
                    </button>
                  </h3>
                  <div
                    id={`faq-resp-${atual.id}-${i}`}
                    role="region"
                    aria-labelledby={`faq-btn-${atual.id}-${i}`}
                    hidden={!isOpen}
                    className="pb-6 pr-10 text-sm leading-relaxed text-muted-foreground"
                  >
                    {q.r}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
