import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PRICING_LINKS } from '@/config/pricing-links';
import { BotaoCheckout } from './BotaoCheckout';
import { CheckoutWallet } from './CheckoutWallet';
import { Fundo, MASCARA_RADIAL, cascata, naViewport, subir } from './fundo';
import { ListaBeneficios } from './ListaBeneficios';
import { SeloGarantia } from './SeloGarantia';

// Único plano à venda. O cartão continua claro: botões de checkout e o Wallet Brick do
// Mercado Pago foram desenhados para fundo claro.
export function PrecosPsicologia() {
  return (
    <section id="precos-psicologia" className="relative isolate scroll-mt-16 overflow-hidden bg-noite px-6 py-24 text-quente">
      <Fundo nome="planos" className="-z-10 opacity-30" style={MASCARA_RADIAL} />
      <motion.div
        className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[1fr_26rem] lg:gap-20"
        variants={cascata}
        initial="hidden"
        whileInView="show"
        viewport={naViewport}
      >
        <motion.div variants={subir}>
          <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Psicologia</h2>
          <p className="mt-3 max-w-sm text-quente/80">Um plano simples, com tudo o que você precisa.</p>
        </motion.div>
        <motion.div variants={subir} className="w-full max-w-md">
          <Card className="relative border border-turquesa/60 shadow-[0_0_60px_-10px_rgba(45,212,191,0.55)]">
            <span className="absolute -top-3 right-6 rounded-full bg-turquesa px-3 py-1 text-xs font-bold text-noite">
              Assinatura anual
            </span>
            <CardHeader>
              <CardTitle className="text-xl">Plano Único</CardTitle>
              <p className="pt-3 text-5xl font-bold tracking-tight text-foreground">R$ 789,90</p>
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
              <div className="flex flex-col gap-3 sm:flex-row">
                <BotaoCheckout href={PRICING_LINKS.psicologia.vista} className="h-auto min-h-11 w-full whitespace-normal px-3 py-2 text-center text-sm sm:flex-1">
                  Pagar à vista no Pix
                </BotaoCheckout>
                <BotaoCheckout
                  href={PRICING_LINKS.psicologia.parcelado}
                  variant="outline"
                  className="h-auto min-h-11 w-full whitespace-normal border-petroleo bg-transparent px-3 py-2 text-center text-sm text-petroleo hover:bg-petroleo/5 sm:flex-1"
                >
                  Parcelar em 12x sem juros
                </BotaoCheckout>
              </div>
              <CheckoutWallet />
            </CardContent>
          </Card>
          <p className="mt-4 text-xs text-quente/75">
            Assinatura anual. Fidelidade de 12 meses para pagamento parcelado. Pagamento à vista sem fidelidade.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
