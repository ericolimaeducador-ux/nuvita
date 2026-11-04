// Utilitários do ensaio (Playwright). Tudo contra o ambiente LOCAL (web 127.0.0.1:5173, API 3000).
// Nunca apontar para psi.nuvita.app.br: a trava abaixo recusa qualquer outra origem.
import { chromium } from 'playwright';
import { createRequire } from 'module';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const speakeasy = require('speakeasy');

export const BASE = 'http://127.0.0.1:5173';
const AQUI = dirname(fileURLToPath(import.meta.url));
export const RAIZ_DOC = join(AQUI, '..');
// Imagens ficam FORA do repositório (pasta irmã do clone). Pode ser trocada com a variável SHOTS_DIR.
export const SHOTS = process.env.SHOTS_DIR ?? join(RAIZ_DOC, '..', '..', '..', 'nuvita-psi-levantamento', 'screenshots');
export const RESULT = join(AQUI, 'resultados');
mkdirSync(RESULT, { recursive: true });

export const totp = (segredo) => speakeasy.totp({ secret: segredo, encoding: 'base32' });

export async function abrir({ largura = 1366, altura = 820 } = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: largura, height: altura }, locale: 'pt-BR' });
  // TRAVA R-A: bloqueia qualquer requisição que não seja local.
  await ctx.route('**/*', (r) => {
    const u = new URL(r.request().url());
    const local = ['127.0.0.1', 'localhost'].includes(u.hostname) || u.protocol === 'data:' || u.protocol === 'blob:';
    return local ? r.fallback() : r.abort();
  });
  return { browser, ctx };
}

/** Observa erros de rede (>=400) e de console de uma página. */
export function observar(page) {
  const erros = [];
  const consoleErros = [];
  page.on('response', async (res) => {
    if (res.status() >= 400 && res.request().resourceType() !== 'image') {
      let corpo = '';
      try { corpo = (await res.text()).slice(0, 300); } catch { /* ignore */ }
      erros.push({ status: res.status(), metodo: res.request().method(), url: new URL(res.url()).pathname, corpo });
    }
  });
  page.on('console', (m) => { if (m.type() === 'error') consoleErros.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => consoleErros.push('pageerror: ' + e.message.slice(0, 300)));
  return { erros, consoleErros, limpar() { erros.length = 0; consoleErros.length = 0; } };
}

export async function foto(page, rel, opts = {}) {
  const caminho = join(SHOTS, rel);
  mkdirSync(dirname(caminho), { recursive: true });
  await page.screenshot({ path: caminho, fullPage: opts.fullPage ?? false });
  return 'screenshots/' + rel.replace(/\\/g, '/');
}

/** Login. Devolve a URL final. Preenche o 2FA se o campo aparecer e houver segredo. */
export async function entrar(page, conta) {
  await page.goto(BASE + '/login');
  await page.getByLabel('E-mail').fill(conta.email);
  await page.getByLabel('Senha', { exact: true }).fill(conta.senha);
  await page.getByRole('button', { name: /entrar/i }).click();
  const campo = page.getByLabel(/Código de verificação/);
  try {
    await campo.waitFor({ timeout: 2500 });
    if (conta.segredo2fa) {
      await campo.fill(totp(conta.segredo2fa));
      await page.getByRole('button', { name: /entrar/i }).click();
    }
  } catch { /* sem 2FA */ }
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(800);
  return page.url().replace(BASE, '');
}

/** Resumo estruturado do que a página mostra (sem dado sensível: só rótulos e contagens). */
export async function fatos(page) {
  return page.evaluate(() => {
    const txt = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const vis = (el) => !!(el.offsetWidth || el.offsetHeight);
    return {
      url: location.pathname + location.search,
      titulos: [...document.querySelectorAll('h1,h2')].filter(vis).map(txt).slice(0, 12),
      botoes: [...document.querySelectorAll('button,a[role=button]')].filter(vis).map(txt).filter(Boolean).slice(0, 40),
      links: [...document.querySelectorAll('nav a, aside a')].filter(vis).map(txt).filter(Boolean).slice(0, 30),
      campos: [...document.querySelectorAll('input,textarea,select,[role=combobox]')].filter(vis).map((e) => (e.getAttribute('aria-label') || e.getAttribute('placeholder') || e.id || e.name || e.type || '').slice(0, 50)).filter(Boolean).slice(0, 30),
      dialogo: document.querySelector('[role=dialog]') ? txt(document.querySelector('[role=dialog]')) : null,
    };
  });
}

export function salvarResultado(nome, dados) {
  writeFileSync(join(RESULT, nome + '.json'), JSON.stringify(dados, null, 2));
}
export function lerContas(caminho) {
  return JSON.parse(readFileSync(caminho, 'utf-8'));
}

/** Login atravessando os gates (termo, troca de senha). Se trocar a senha, refaz o login com a nova. */
export async function entrarComGates(page, conta, novaSenha, fotoPrefixo) {
  let destino = await entrar(page, conta);
  for (let i = 0; i < 5; i++) {
    if (destino.includes('/aceitar-termos')) {
      if (fotoPrefixo) await foto(page, `${fotoPrefixo}-termo.png`);
      await page.getByRole('checkbox').first().check();
      await page.getByRole('button', { name: /aceitar|confirmar|continuar/i }).first().click();
    } else if (destino.includes('/definir-senha')) {
      if (fotoPrefixo) await foto(page, `${fotoPrefixo}-definir-senha.png`);
      const s = page.locator('input[type=password]');
      for (let k = 0; k < (await s.count()); k++) await s.nth(k).fill(novaSenha);
      await page.getByRole('button', { name: /definir senha/i }).click();
      await page.waitForTimeout(1500);
      if (page.url().includes('/login')) { conta.senha = novaSenha; destino = await entrar(page, conta); continue; }
    } else break;
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1000);
    destino = page.url().replace(BASE, '');
  }
  return destino;
}
