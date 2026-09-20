import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { PRICING_LINKS } from '@/config/pricing-links';
import { BotaoCheckout } from './BotaoCheckout';
import { ListaBeneficios } from './ListaBeneficios';
import { SeloGarantia } from './SeloGarantia';

interface Plano {
  titulo: string;
  armazenamento: string;
  apoio: string;
  limites: string;
  preco: string;
  parcelado: string;
  beneficios: string[];
  links: { readonly vista: string; readonly parcelado: string };
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
    links: PRICING_LINKS.estomoBasico,
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
    links: PRICING_LINKS.estomoPremium,
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

// Estomoterapia ainda não foi lançada: o botão único só habilita quando os DOIS links existirem
// ("Em breve" desabilitado caso contrário). No lançamento, ganha os dois botões (vista/parcelado) como a Psicologia.
function CartaoPlano({ plano }: { plano: Plano }) {
  return (
    <Card
      className={cn(
        'relative flex h-full flex-col',
        plano.destaque
          ? 'border-2 border-petroleo shadow-none lg:-translate-y-3'
          : 'border border-sage/60 shadow-none',
      )}
    >
      {plano.destaque && (
        <span className="absolute -top-3 left-6 rounded-md bg-ouro px-3 py-1 text-xs font-bold text-ink">
          Mais popular
        </span>
      )}
      <CardHeader>
        <CardTitle className="text-xl">{plano.titulo}</CardTitle>
        <p className="pt-2 text-4xl font-bold tracking-tight text-petroleo-medio">{plano.armazenamento}</p>
        <p className="text-xs text-muted-foreground">{plano.apoio}</p>
        <p className="pt-1 text-xs font-medium text-foreground">{plano.limites}</p>
        <p className="pt-4 whitespace-nowrap text-3xl font-bold tracking-tight text-foreground">{plano.preco}</p>
        <p className="text-sm text-muted-foreground">à vista no Pix ou débito</p>
        <p className="text-sm text-muted-foreground">{plano.parcelado}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="flex">
          <SeloGarantia>14 dias de garantia incondicional — devolvemos 100% do valor</SeloGarantia>
        </div>
        <ListaBeneficios itens={plano.beneficios} />
        <div className="mt-auto pt-2">
          <BotaoCheckout
            href={plano.links.vista && plano.links.parcelado ? plano.links.vista : ''}
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
    <Card className="flex h-full flex-col border border-sage/60 shadow-none">
      <CardHeader>
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
    <section id="precos-estomoterapia" className="scroll-mt-16 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14">
          <h2 className="font-display text-4xl font-medium leading-tight text-petroleo sm:text-5xl">Estomoterapia</h2>
          <p className="mt-3 max-w-md text-muted-foreground">Escolha o armazenamento ideal para o seu acompanhamento.</p>
        </div>

        <div className="grid items-stretch gap-10 lg:grid-cols-3 lg:gap-8">
          <div className="mx-auto w-full max-w-md lg:max-w-none lg:pt-3"><CartaoPlano plano={planos[0]} /></div>
          <div className="mx-auto w-full max-w-md lg:max-w-none"><CartaoPlano plano={planos[1]} /></div>
          <div className="mx-auto w-full max-w-md lg:max-w-none lg:pt-3"><CartaoEnterprise /></div>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          Assinatura anual. Fidelidade de 12 meses para pagamento parcelado. Pagamento à vista sem fidelidade.
        </p>
      </div>
    </section>
  );
}
