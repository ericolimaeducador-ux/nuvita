import { Request } from 'express';

export interface RequestMeta {
  ip: string;
  userAgent: string;
}

/**
 * Extrai o IP do cliente usando a ÚLTIMA entrada de X-Forwarded-For — a que
 * foi anexada pelo proxy confiável (nginx com $proxy_add_x_forwarded_for,
 * GFE do Cloud Run). A primeira entrada é controlada pelo cliente e não pode
 * ser usada para rate limiting nem auditoria.
 */
export function extractClientIp(request: Request): string {
  const forwardedFor = request.headers['x-forwarded-for'];
  const raw = Array.isArray(forwardedFor) ? forwardedFor.join(',') : forwardedFor;

  if (raw) {
    const parts = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return last;
  }

  return request.ip || 'unknown';
}

export function extractRequestMeta(request: Request): RequestMeta {
  return {
    ip: extractClientIp(request),
    userAgent: request.headers['user-agent'] ?? 'unknown',
  };
}
