import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PRICING_LINKS } from '@/config/pricing-links';
import { BotaoCheckout } from './BotaoCheckout';
import { ListaBeneficios } from './ListaBeneficios';
import { SeloGarantia } from './SeloGarantia';

export function PrecosPsicologia() {
  return (
    <section id="precos-psicologia" className="scroll-mt-16 bg-card px-6 py-24">
      <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[1fr_26rem] lg:gap-20">
        <div>
          <h2 className="font-display text-4xl font-medium leading-tight text-petroleo sm:text-5xl">Psicologia</h2>
          <p className="mt-3 max-w-sm text-muted-foreground">Um plano simples, com tudo o que você precisa.</p>
        </div>
        <div className="w-full max-w-md">
          <Card className="border border-sage/60 shadow-none">
            <CardHeader>
              <CardTitle className="text-xl">Plano Único</CardTitle>
              <p className="pt-3 text-5xl font-bold tracking-tight text-foreground">R$ 599,90</p>
              <p className="text-sm text-muted-foreground">à vista no Pix ou débito</p>
              <p className="text-sm text-muted-foreground">ou 12x de R$ 69,90 sem juros no cartão</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex">
                <SeloGarantia>14 dias de garantia incondicional — devolvemos 100% do valor</SeloGarantia>
              </div>
              <ListaBeneficios
                itens={[
                  'Prontuário eletrônico completo para psicólogos',
                  'Agenda, evolução de sessão e histórico de acompanhamento',
                  'Dados protegidos com criptografia, conforme LGPD',
                ]}
              />
              <BotaoCheckout href={PRICING_LINKS.psicologia} className="h-11 w-full text-base">
                Assinar agora
              </BotaoCheckout>
            </CardContent>
          </Card>
          <p className="mt-4 text-xs text-muted-foreground">
            Assinatura anual. Fidelidade de 12 meses para pagamento parcelado. Pagamento à vista sem fidelidade.
          </p>
        </div>
      </div>
    </section>
  );
}
