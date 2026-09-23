import { createHmac } from 'crypto';
import { assinaturaWebhookValida } from './assinatura-webhook';
import { PLANOS, PLANO_IDS } from './planos';

const segredo = 'segredo-de-teste';
const assinar = (id: string, requestId: string, ts: string) =>
  createHmac('sha256', segredo).update(`id:${id};request-id:${requestId};ts:${ts};`).digest('hex');

describe('assinaturaWebhookValida', () => {
  const base = { segredo, xRequestId: 'req-1', dataId: '123456' };

  it('aceita assinatura correta', () => {
    const v1 = assinar('123456', 'req-1', '1700000000');
    expect(assinaturaWebhookValida({ ...base, xSignature: `ts=1700000000,v1=${v1}` })).toBe(true);
  });

  it('normaliza data.id alfanumérico para minúsculas', () => {
    const v1 = assinar('abc123', 'req-1', '1700000000');
    expect(assinaturaWebhookValida({ ...base, dataId: 'ABC123', xSignature: `ts=1700000000,v1=${v1}` })).toBe(true);
  });

  it('recusa assinatura adulterada, segredo errado, header ausente ou malformado', () => {
    const v1 = assinar('123456', 'req-1', '1700000000');
    expect(assinaturaWebhookValida({ ...base, xSignature: `ts=1700000000,v1=${v1.slice(0, -1)}0` })).toBe(false);
    expect(assinaturaWebhookValida({ ...base, segredo: 'outro', xSignature: `ts=1700000000,v1=${v1}` })).toBe(false);
    expect(assinaturaWebhookValida({ ...base, dataId: '999', xSignature: `ts=1700000000,v1=${v1}` })).toBe(false);
    expect(assinaturaWebhookValida({ ...base, xSignature: undefined })).toBe(false);
    expect(assinaturaWebhookValida({ ...base, xSignature: 'lixo' })).toBe(false);
  });
});

describe('planos', () => {
  it('cada id do catálogo existe e tem valor positivo em reais', () => {
    for (const id of PLANO_IDS) expect(PLANOS[id].valor).toBeGreaterThan(0);
  });
  it('parcelado = 12 x 69,90', () => {
    expect(PLANOS['psicologia-vista'].valor).toBe(599.9);
    expect(PLANOS['psicologia-parcelado'].valor).toBeCloseTo(12 * 69.9, 2);
  });
});
