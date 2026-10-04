import { readFileSync } from 'fs';
import { join } from 'path';

const mockCreate = jest.fn();
jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn(),
  Payment: jest.fn(),
  Preference: jest.fn().mockImplementation(() => ({ create: mockCreate })),
}));

import { MercadoPagoService } from './mercado-pago.service';
import { PLANOS } from './planos';

const WEB = join(__dirname, '../../../../web/src');
const lerWeb = (rel: string) => readFileSync(join(WEB, rel), 'utf8');
const brl = (n: number) => `R$ ${n.toFixed(2).replace('.', ',')}`;

describe('preço do plano anual de Psicologia', () => {
  it('à vista = 789,90', () => {
    expect(PLANOS['psicologia-vista'].valor).toBe(789.9);
  });

  it('parcelado = 12 x 69,90 = 838,80, valor fixo (não derivado do à vista)', () => {
    expect(12 * 69.9).toBeCloseTo(838.8, 2);
    expect(PLANOS['psicologia-parcelado'].valor).toBe(838.8);
    expect(PLANOS['psicologia-parcelado'].meiosDePagamento.parcelasMaximas).toBe(12);
  });

  it('o preço antigo (599,90) não aparece mais em nenhuma tela de preço', () => {
    for (const arq of [
      'components/landing/PrecosPsicologia.tsx',
      'components/landing/CheckoutWallet.tsx',
      'pages/TermosPage.tsx',
    ]) {
      expect(lerWeb(arq)).not.toMatch(/599[,.]90/);
    }
  });

  it('o valor exibido na landing e nos Termos é o mesmo do catálogo cobrado', () => {
    const vista = brl(PLANOS['psicologia-vista'].valor);
    expect(lerWeb('components/landing/PrecosPsicologia.tsx')).toContain(vista);
    expect(lerWeb('components/landing/CheckoutWallet.tsx')).toContain(vista);
    expect(lerWeb('pages/TermosPage.tsx')).toContain(vista.replace('R$ ', 'R$'));
    expect(lerWeb('components/landing/PrecosPsicologia.tsx')).toContain('12x de R$ 69,90');
    expect(lerWeb('pages/TermosPage.tsx')).toContain('12x de R$69,90');
  });
});

describe('MercadoPagoService.criarPreferencia — valor cobrado = valor do catálogo', () => {
  const pedidos = {
    create: jest.fn().mockResolvedValue(undefined),
    updateOne: jest.fn().mockResolvedValue(undefined),
  };
  const service = new MercadoPagoService(pedidos as never);

  beforeEach(() => {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = 'TEST-token-falso';
    mockCreate.mockReset().mockResolvedValue({ id: 'pref-1' });
    pedidos.create.mockClear();
  });

  it.each([
    ['psicologia-vista', 789.9, ['credit_card', 'ticket']],
    ['psicologia-parcelado', 838.8, ['ticket', 'bank_transfer', 'debit_card']],
  ] as const)('%s cobra %s e grava o mesmo valor esperado no pedido', async (planoId, valor, excluidos) => {
    await service.criarPreferencia(planoId);

    const body = mockCreate.mock.calls[0][0].body;
    expect(body.items).toHaveLength(1);
    expect(body.items[0].unit_price).toBe(valor);
    expect(body.payment_methods.excluded_payment_types.map((m: { id: string }) => m.id)).toEqual(excluidos);
    expect(pedidos.create).toHaveBeenCalledWith(expect.objectContaining({ plano: planoId, valor }));
  });

  it('o parcelado exige cartão em 12 parcelas; o à vista não permite crédito', async () => {
    await service.criarPreferencia('psicologia-parcelado');
    expect(mockCreate.mock.calls[0][0].body.payment_methods).toEqual(
      expect.objectContaining({ installments: 12, default_installments: 12 }),
    );
  });
});
