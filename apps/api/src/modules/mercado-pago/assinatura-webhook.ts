import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Valida a assinatura (header `x-signature`) das notificações do Mercado Pago.
 *
 * Formato do header: `ts=<timestamp>,v1=<hmac_sha256_hex>`.
 * Manifesto assinado: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 * (data.id vem da query string; se for alfanumérico, em minúsculas).
 */
export function assinaturaWebhookValida(params: {
  segredo: string;
  xSignature: string | undefined;
  xRequestId: string | undefined;
  dataId: string | undefined;
}): boolean {
  const { segredo, xSignature, xRequestId, dataId } = params;
  if (!xSignature || !dataId) return false;

  let ts: string | undefined;
  let v1: string | undefined;
  for (const parte of xSignature.split(',')) {
    const [chave, ...resto] = parte.split('=');
    const valor = resto.join('=').trim();
    if (chave.trim() === 'ts') ts = valor;
    else if (chave.trim() === 'v1') v1 = valor;
  }
  if (!ts || !v1) return false;

  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  let manifesto = `id:${id};`;
  if (xRequestId) manifesto += `request-id:${xRequestId};`;
  manifesto += `ts:${ts};`;

  const esperado = createHmac('sha256', segredo).update(manifesto).digest('hex');
  const a = Buffer.from(esperado, 'utf8');
  const b = Buffer.from(v1, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
