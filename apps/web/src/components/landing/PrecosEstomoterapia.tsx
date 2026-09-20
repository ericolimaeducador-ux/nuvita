import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PRICING_LINKS } from '@/config/pricing-links';
import { BotaoCheckout } from './BotaoCheckout';
import { ListaBeneficios } from './ListaBeneficios';
import { Reveal } from './Reveal';
import { SeloGarantia } from './SeloGarantia';

interface Plano {
  titulo: string;
  armazenamento: string;
  apoio: string;
  limites: string;
  preco: string;
  parcelado: string;
  beneficios: string[];
  href: string;
  destaque?: boolean;
}

const planos: Plano[] = [
  {
    titulo: 'Básico',
    armazenamento: '200 MB',
    apoio: '(equivalente a ~40 fotos de lesão)',
    limites: 'Fotos até 5 MB · Documentos até 10 MB',
    preco: 'R$ 1.590,00',
    parcelado: 'ou 12x de R$ 149,90 sem juros',
    beneficios: ['Prontuário eletrônico completo', 'Suporte padrão'],
    href: PRICING_LINKS.estomoBasico,
  },
  {
    titulo: 'Premium',
    armazenamento: '1 GB',
    apoio: '(equivalente a ~200 fotos de lesão — 5x mais espaço)',
    limites: 'Fotos até 5 MB · Documentos até 10 MB',
    preco: 'R$ 1.990,00',
    parcelado: 'ou 12x de R$ 219,90 sem juros',
    beneficios: [
      'Prontuário eletrônico completo',
      '5x mais espaço para fotos de evolução',
      'Ideal para acompanhamento de lesões complexas',
    ],
    href: PRICING_LINKS.estomoPremium,
    destaque: true,
  },
];

const beneficiosEnterprise = [
  'Múltiplos usuários/profissionais',
  'Armazenamento sob medida',
  'Múltiplas unidades/clínicas',
  'Onboarding assistido',
  'Suporte com SLA definido',
  'Contrato com faturamento (boleto/NF)',
];

function CartaoPlano({ plano }: { plano: Plano }) {
  return (
    <Card
      className={cn(
        'relative flex h-full flex-col',
        plano.destaque
          ? 'border-2 border-brand-cobalt shadow-2xl lg:-translate-y-3'
          : 'border border-border',
      )}
    >
      {plano.destaque && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent-gold px-3 py-1 text-xs font-bold text-gray-900 shadow">
          Mais popular
        </span>
      )}
      <CardHeader className="items-center text-center">
        <CardTitle className="text-xl">{plano.titulo}</CardTitle>
        <p className="pt-2 text-4xl font-bold tracking-tight text-brand-cobalt">{plano.armazenamento}</p>
        <p className="text-xs text-muted-foreground">{plano.apoio}</p>
        <p className="pt-1 text-xs font-medium text-foreground">{plano.limites}</p>
        <p className="pt-4 whitespace-nowrap text-3xl font-bold tracking-tight text-foreground">{plano.preco}</p>
        <p className="text-sm text-muted-foreground">à vista no Pix ou débito</p>
        <p className="text-sm text-muted-foreground">{plano.parcelado}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="flex justify-center">
          <SeloGarantia>14 dias de garantia incondicional — devolvemos 100% do valor</SeloGarantia>
        </div>
        <ListaBeneficios itens={plano.beneficios} />
        <div className="mt-auto pt-2">
          <BotaoCheckout
            href={plano.href}
            variant={plano.destaque ? 'default' : 'outline'}
            className="h-11 w-full text-base"
          >
            Assinar agora
          </BotaoCheckout>
        </div>
      </CardContent>
    </Card>
  );
}

function CartaoEnterprise() {
  return (
    <Card className="flex h-full flex-col border border-border">
      <CardHeader className="items-center text-center">
        <CardTitle className="text-xl">Enterprise</CardTitle>
        <p className="pt-6 text-3xl font-bold tracking-tight text-foreground">Sob consulta</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        <ListaBeneficios itens={beneficiosEnterprise} />
        <div className="mt-auto pt-2">
          <BotaoCheckout href={PRICING_LINKS.whatsappVendas} variant="outline" className="h-11 w-full text-base">
            Falar com o time
          </BotaoCheckout>
        </div>
      </CardContent>
    </Card>
  );
}

export function PrecosEstomoterapia() {
  return (
    <section id="precos-estomoterapia" className="scroll-mt-16 px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mb-12 text-center">
          <h2 className="text-3xl font-semibold">Estomoterapia</h2>
          <p className="mt-2 text-muted-foreground">Escolha o armazenamento ideal para o seu acompanhamento.</p>
        </Reveal>

        <div className="grid items-stretch gap-10 lg:grid-cols-3 lg:gap-8">
          <Reveal delay={0.05} className="mx-auto w-full max-w-md lg:max-w-none lg:pt-3"><CartaoPlano plano={planos[0]} /></Reveal>
          <Reveal delay={0.15} className="mx-auto w-full max-w-md lg:max-w-none"><CartaoPlano plano={planos[1]} /></Reveal>
          <Reveal delay={0.25} className="mx-auto w-full max-w-md lg:max-w-none lg:pt-3"><CartaoEnterprise /></Reveal>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Assinatura anual. Fidelidade de 12 meses para pagamento parcelado. Pagamento à vista sem fidelidade.
        </p>
      </div>
    </section>
  );
}
