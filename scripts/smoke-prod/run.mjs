#!/usr/bin/env node
/**
 * Bateria de smoke NÃO DESTRUTIVA contra a API de produção do Nuvita.
 *
 * Regras (Erico Henrique de Lima Araujo / Orquestrador 7Safe):
 * - NUNCA DELETE / remove / desativar / excluir pacientes ou dados clínicos.
 * - Preferir leitura. POST só em /auth/login e /auth/logout.
 * - Não rotaciona segredos, não faz deploy, não altera env do Cloud Run.
 *
 * Rotas baseadas no código real de apps/api (sem prefixo /api):
 *   GET  /health
 *   GET  /docs          (Swagger — fechado em production)
 *   POST /auth/login
 *   GET  /pacientes
 *   GET  /produtos      (equivalente tenant-read; NÃO existe GET /clinicas/me)
 *   GET  /super-admin/clinicas  (só SUPER_ADMIN)
 *   GET  /telemedicina/acesso/:token
 *
 * Uso:
 *   node scripts/smoke-prod/run.mjs
 *   API_BASE=https://api.nuvita.app.br node scripts/smoke-prod/run.mjs
 *   SMOKE_EMAIL=... SMOKE_PASSWORD=... node scripts/smoke-prod/run.mjs
 */

import { createHmac } from 'node:crypto';

const API_BASE = (process.env.API_BASE || 'https://api.nuvita.app.br').replace(/\/$/, '');
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 15_000);
const USER_AGENT = 'nuvita-smoke-prod/1.0 (+scripts/smoke-prod)';

const POST_ALLOWLIST = new Set(['/auth/login', '/auth/logout']);
const BLOCKED_PATH = /delete|remove|desativar|excluir/i;
const BLOCKED_METHOD = new Set(['DELETE', 'PUT', 'PATCH']);

const SMOKE_EMAIL = process.env.SMOKE_EMAIL;
const SMOKE_PASSWORD = process.env.SMOKE_PASSWORD;
const SMOKE_TOTP = process.env.SMOKE_TOTP;
const SMOKE_TOTP_SECRET = process.env.SMOKE_TOTP_SECRET;
const SMOKE_CLINICA_ID = process.env.SMOKE_CLINICA_ID;
const WANT_JSON = process.argv.includes('--json');

/** @typedef {{ id: string; title: string; required: boolean; status: 'pass'|'fail'|'skip'; detail: string; httpStatus?: number }} CaseResult */

/** @type {CaseResult[]} */
const results = [];

let accessToken = '';
/** @type {Record<string, unknown> | null} */
let sessionUser = null;

function log(line) {
  if (!WANT_JSON) console.log(line);
}

function record(result) {
  results.push(result);
  const icon = result.status === 'pass' ? 'PASS' : result.status === 'skip' ? 'SKIP' : 'FAIL';
  const http = result.httpStatus != null ? ` [${result.httpStatus}]` : '';
  log(`  ${icon.padEnd(4)} ${result.id} — ${result.title}${http}`);
  if (result.detail) log(`       ${result.detail}`);
}

function assertSafeRequest(method, path) {
  const upper = method.toUpperCase();
  if (BLOCKED_METHOD.has(upper)) {
    throw new Error(`BLOQUEADO: método ${upper} é proibido nesta bateria.`);
  }
  if (BLOCKED_PATH.test(path)) {
    throw new Error(`BLOQUEADO: path "${path}" parece mutação destrutiva.`);
  }
  if (upper === 'POST' && !POST_ALLOWLIST.has(path.split('?')[0])) {
    throw new Error(`BLOQUEADO: POST só é permitido em ${[...POST_ALLOWLIST].join(', ')}. Pedido: ${path}`);
  }
  if (upper !== 'GET' && upper !== 'POST') {
    throw new Error(`BLOQUEADO: método ${upper} não é permitido.`);
  }
}

/**
 * @param {string} method
 * @param {string} path
 * @param {{ body?: unknown, token?: string, headers?: Record<string, string> }} [opts]
 */
async function request(method, path, opts = {}) {
  assertSafeRequest(method, path);
  const url = `${API_BASE}${path}`;
  const headers = {
    accept: 'application/json',
    'user-agent': USER_AGENT,
    ...(opts.headers ?? {}),
  };
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  const token = opts.token ?? accessToken;
  if (token) headers.authorization = `Bearer ${token}`;
  if (SMOKE_CLINICA_ID && !headers['x-clinica-id']) {
    headers['x-clinica-id'] = SMOKE_CLINICA_ID;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      redirect: 'manual',
      signal: controller.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: res.status, ok: res.ok, json, text, headers: res.headers };
  } finally {
    clearTimeout(timer);
  }
}

function nestMessage(json) {
  if (!json || typeof json !== 'object') return '';
  const msg = json.message;
  if (Array.isArray(msg)) return msg.join('; ');
  if (typeof msg === 'string') return msg;
  return '';
}

function summarizeUser(user) {
  if (!user || typeof user !== 'object') return 'user ausente';
  const papel = typeof user.papel === 'string' ? user.papel : '?';
  const hasClinica = Boolean(user.clinicaId);
  const hasId = Boolean(user.id);
  return `papel=${papel} clinicaId=${hasClinica ? 'presente' : 'ausente'} id=${hasId ? 'presente' : 'ausente'}`;
}

function countItems(payload) {
  if (Array.isArray(payload)) return payload.length;
  if (payload && typeof payload === 'object' && Array.isArray(payload.items)) return payload.items.length;
  return null;
}

/** TOTP RFC 6238 (SHA-1, 30s, 6 dígitos) — sem dependência extra. */
function totpFromSecret(base32) {
  const key = decodeBase32(base32.replace(/\s+/g, '').toUpperCase());
  const counter = Math.floor(Date.now() / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x1_0000_0000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(bin % 1_000_000).padStart(6, '0');
}

function decodeBase32(input) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const ch of input.replace(/=+$/, '')) {
    const val = alphabet.indexOf(ch);
    if (val < 0) throw new Error(`SMOKE_TOTP_SECRET inválido (base32): caractere "${ch}"`);
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function resolveTotp() {
  if (SMOKE_TOTP) return SMOKE_TOTP;
  if (SMOKE_TOTP_SECRET) return totpFromSecret(SMOKE_TOTP_SECRET);
  return undefined;
}

async function caseHealth() {
  const id = 'health';
  const title = 'GET /health — MongoDB up';
  try {
    const res = await request('GET', '/health');
    const mongo = res.json?.info?.mongodb?.status ?? res.json?.details?.mongodb?.status;
    const ok = res.status === 200 && res.json?.status === 'ok' && mongo === 'up';
    record({
      id,
      title,
      required: true,
      status: ok ? 'pass' : 'fail',
      httpStatus: res.status,
      detail: ok
        ? 'status=ok, mongodb=up'
        : `esperado 200 + status=ok + mongodb=up; veio status=${res.json?.status ?? '?'} mongodb=${mongo ?? '?'}${nestMessage(res.json) ? ` (${nestMessage(res.json)})` : ''}`,
    });
  } catch (error) {
    record({
      id,
      title,
      required: true,
      status: 'fail',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function caseDocsClosed() {
  const id = 'docs-closed';
  const title = 'GET /docs — Swagger fechado em produção';
  try {
    const docs = await request('GET', '/docs');
    const docsJson = await request('GET', '/docs-json');
    const closed = docs.status !== 200 && docsJson.status !== 200;
    record({
      id,
      title,
      required: true,
      status: closed ? 'pass' : 'fail',
      httpStatus: docs.status,
      detail: closed
        ? `/docs=${docs.status}, /docs-json=${docsJson.status} (não-200)`
        : `Swagger parece aberto: /docs=${docs.status}, /docs-json=${docsJson.status}. Em production só reabre com EXPOSE_DOCS=true (apps/api/src/main.ts).`,
    });
  } catch (error) {
    record({
      id,
      title,
      required: true,
      status: 'fail',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function caseLoginInvalid() {
  const id = 'login-invalid';
  const title = 'POST /auth/login — credenciais inválidas → 401';
  try {
    const res = await request('POST', '/auth/login', {
      body: {
        email: 'smoke-invalid@example.com',
        password: 'SMOKE_TEST_wrong_password',
      },
    });
    const ok = res.status === 401;
    const hint =
      res.status === 429
        ? ' Rate limit de /auth/login (10/min + limiter por IP). Aguarde e rode de novo.'
        : '';
    record({
      id,
      title,
      required: true,
      status: ok ? 'pass' : 'fail',
      httpStatus: res.status,
      detail: ok
        ? nestMessage(res.json) || '401 Unauthorized'
        : `esperado 401; veio ${res.status}.${hint} ${nestMessage(res.json)}`.trim(),
    });
  } catch (error) {
    record({
      id,
      title,
      required: true,
      status: 'fail',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function caseTenantNoToken() {
  const id = 'tenant-no-token';
  const title = 'GET /pacientes sem token → 401 (guard JWT/tenant)';
  try {
    const pacientes = await request('GET', '/pacientes?limit=1', { token: '' });
    const produtos = await request('GET', '/produtos', { token: '' });
    const ok = pacientes.status === 401 && produtos.status === 401;
    record({
      id,
      title,
      required: true,
      status: ok ? 'pass' : 'fail',
      httpStatus: pacientes.status,
      detail: ok
        ? '/pacientes e /produtos recusaram sem Authorization'
        : `esperado 401 em ambas; /pacientes=${pacientes.status}, /produtos=${produtos.status}`,
    });
  } catch (error) {
    record({
      id,
      title,
      required: true,
      status: 'fail',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function caseTelemedicinaInvalidToken() {
  const id = 'telemedicina-token-invalido';
  const title = 'GET /telemedicina/acesso/:token inválido → 4xx';
  try {
    const token = 'SMOKE_TEST_token_invalido';
    const res = await request('GET', `/telemedicina/acesso/${encodeURIComponent(token)}`);
    const ok = res.status >= 400 && res.status < 500;
    record({
      id,
      title,
      required: false,
      status: ok ? 'pass' : 'fail',
      httpStatus: res.status,
      detail: ok
        ? nestMessage(res.json) || `4xx (${res.status})`
        : `esperado 4xx (NotFoundException no serviço); veio ${res.status}`,
    });
  } catch (error) {
    record({
      id,
      title,
      required: false,
      status: 'fail',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function caseAuthenticatedLogin() {
  const id = 'auth-login';
  const title = 'POST /auth/login autenticado (SMOKE_EMAIL)';
  if (!SMOKE_EMAIL || !SMOKE_PASSWORD) {
    record({
      id,
      title,
      required: false,
      status: 'skip',
      detail: 'SMOKE_EMAIL / SMOKE_PASSWORD não definidos — bloco autenticado ignorado',
    });
    return false;
  }

  try {
    const totpCode = resolveTotp();
    const body = { email: SMOKE_EMAIL, password: SMOKE_PASSWORD };
    if (totpCode) body.totpCode = totpCode;

    const res = await request('POST', '/auth/login', { body });
    const token = typeof res.json?.accessToken === 'string' ? res.json.accessToken : '';
    const user = res.json?.user && typeof res.json.user === 'object' ? res.json.user : null;
    const ok = res.status === 200 && Boolean(token) && Boolean(user?.id) && Boolean(user?.papel);

    if (ok) {
      accessToken = token;
      sessionUser = user;
    }

    let detail;
    if (ok) {
      detail = summarizeUser(user);
    } else if (res.status === 401 && /2FA|totp/i.test(nestMessage(res.json))) {
      detail = `${nestMessage(res.json)} — defina SMOKE_TOTP (6 dígitos) ou SMOKE_TOTP_SECRET (base32).`;
    } else if (res.status === 429) {
      detail = '429 — rate limit de login. Aguarde ~1 min.';
    } else {
      detail = `esperado 200 + accessToken + user; veio ${res.status} ${nestMessage(res.json)}`.trim();
    }

    record({
      id,
      title,
      required: false,
      status: ok ? 'pass' : 'fail',
      httpStatus: res.status,
      detail,
    });
    return ok;
  } catch (error) {
    record({
      id,
      title,
      required: false,
      status: 'fail',
      detail: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

async function casePacientesList() {
  const id = 'auth-pacientes-list';
  const title = 'GET /pacientes?limit=1 — lista somente (sem delete, sem :id)';
  if (!accessToken) {
    record({
      id,
      title,
      required: false,
      status: 'skip',
      detail: 'sem sessão autenticada',
    });
    return;
  }

  try {
    const res = await request('GET', '/pacientes?limit=1');
    const isSuperAdmin = sessionUser?.papel === 'SUPER_ADMIN';
    const needsClinica = res.status === 403 && isSuperAdmin && !SMOKE_CLINICA_ID;

    if (needsClinica) {
      record({
        id,
        title,
        required: false,
        status: 'skip',
        httpStatus: res.status,
        detail:
          'SUPER_ADMIN sem clinicaId no token — TenantRequiredGuard exige header x-clinica-id. Defina SMOKE_CLINICA_ID para exercitar a lista.',
      });
      return;
    }

    const items = countItems(res.json);
    const ok = res.status === 200 && items != null;
    record({
      id,
      title,
      required: false,
      status: ok ? 'pass' : 'fail',
      httpStatus: res.status,
      detail: ok
        ? `lista ok; items=${items} (PII não impresso)`
        : `esperado 200 + { items }; veio ${res.status} ${nestMessage(res.json)}`.trim(),
    });
  } catch (error) {
    record({
      id,
      title,
      required: false,
      status: 'fail',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function caseClinicaContext() {
  const id = 'auth-clinica-context';
  const title = 'Contexto de clínica (não existe GET /clinicas/me)';
  if (!accessToken || !sessionUser) {
    record({
      id,
      title,
      required: false,
      status: 'skip',
      detail: 'sem sessão autenticada',
    });
    return;
  }

  try {
    const isSuperAdmin = sessionUser.papel === 'SUPER_ADMIN';
    const parts = [`login.user ${summarizeUser(sessionUser)}`];

    if (isSuperAdmin) {
      const clinicas = await request('GET', '/super-admin/clinicas');
      const n = countItems(clinicas.json);
      if (clinicas.status !== 200 || n == null) {
        record({
          id,
          title,
          required: false,
          status: 'fail',
          httpStatus: clinicas.status,
          detail: `GET /super-admin/clinicas esperado 200; veio ${clinicas.status} ${nestMessage(clinicas.json)}`.trim(),
        });
        return;
      }
      parts.push(`/super-admin/clinicas items=${n}`);
    } else {
      const produtos = await request('GET', '/produtos');
      const n = countItems(produtos.json);
      if (produtos.status !== 200 || n == null) {
        record({
          id,
          title,
          required: false,
          status: 'fail',
          httpStatus: produtos.status,
          detail: `GET /produtos (tenant-read) esperado 200; veio ${produtos.status} ${nestMessage(produtos.json)}`.trim(),
        });
        return;
      }
      parts.push(`/produtos items=${n}`);
      if (!sessionUser.clinicaId) {
        record({
          id,
          title,
          required: false,
          status: 'fail',
          detail: 'usuário de clínica sem clinicaId no payload de login',
        });
        return;
      }
    }

    record({
      id,
      title,
      required: false,
      status: 'pass',
      httpStatus: 200,
      detail: parts.join(' · '),
    });
  } catch (error) {
    record({
      id,
      title,
      required: false,
      status: 'fail',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function caseLogout() {
  const id = 'auth-logout';
  const title = 'POST /auth/logout — encerra sessão smoke';
  if (!accessToken) {
    record({
      id,
      title,
      required: false,
      status: 'skip',
      detail: 'sem sessão autenticada',
    });
    return;
  }

  try {
    const res = await request('POST', '/auth/logout');
    const ok = res.status === 200 && res.json?.ok === true;
    record({
      id,
      title,
      required: false,
      status: ok ? 'pass' : 'fail',
      httpStatus: res.status,
      detail: ok ? 'ok=true' : `esperado 200 { ok: true }; veio ${res.status}`,
    });
  } catch (error) {
    record({
      id,
      title,
      required: false,
      status: 'fail',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function main() {
  log('');
  log('Nuvita — smoke de produção (não destrutivo)');
  log(`API_BASE=${API_BASE}`);
  log('Regras: sem DELETE/remove em pacientes; POST só em /auth/login e /auth/logout.');
  log('');

  await caseHealth();
  await caseDocsClosed();
  await caseLoginInvalid();
  await caseTenantNoToken();
  await caseTelemedicinaInvalidToken();

  await caseAuthenticatedLogin();
  await casePacientesList();
  await caseClinicaContext();
  await caseLogout();

  const requiredFailed = results.filter((r) => r.required && r.status === 'fail');
  const optionalFailed = results.filter((r) => !r.required && r.status === 'fail');
  const passed = results.filter((r) => r.status === 'pass').length;
  const skipped = results.filter((r) => r.status === 'skip').length;

  log('');
  log(`Resumo: ${passed} pass / ${results.filter((r) => r.status === 'fail').length} fail / ${skipped} skip`);
  if (requiredFailed.length) {
    log(`Falhas obrigatórias: ${requiredFailed.map((r) => r.id).join(', ')}`);
  }
  if (optionalFailed.length) {
    log(`Falhas opcionais: ${optionalFailed.map((r) => r.id).join(', ')}`);
  }
  log('');

  if (WANT_JSON) {
    console.log(
      JSON.stringify(
        {
          apiBase: API_BASE,
          passed,
          failed: results.filter((r) => r.status === 'fail').length,
          skipped,
          results,
        },
        null,
        2,
      ),
    );
  }

  if (requiredFailed.length) process.exit(1);
  if (optionalFailed.length) process.exit(2);
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
