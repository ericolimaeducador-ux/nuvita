// Cria o ADMIN pela interface (Super Admin -> Novo usuário) e registra o que a tela mostra.
import { abrir, observar, foto, entrar, lerContas, BASE } from './lib.mjs';
import { writeFileSync } from 'fs';
const caminho = process.env.CONTAS; const c = lerContas(caminho);
const { browser, ctx } = await abrir();
const page = await ctx.newPage(); const obs = observar(page);
let resposta = null;
page.on('response', async (r) => { if (r.url().endsWith('/super-admin/usuarios') && r.request().method() === 'POST') { try { resposta = { status: r.status(), chaves: Object.keys(await r.json()) }; } catch {} } });
await entrar(page, c.superAdmin);
await page.goto(BASE + '/super-admin'); await page.waitForLoadState('networkidle');
await page.getByRole('button', { name: /novo usuário/i }).first().click();
const d = page.getByRole('dialog');
await d.getByPlaceholder('João da Silva').fill('Admin Demonstração Clínica');
await d.getByPlaceholder('usuario@nuvita.com').fill('admin.demo@manual.nuvita.test');
await d.getByPlaceholder('mín. 10 caracteres').fill('AdminProvisoria#2026');
const sels = d.locator('select');
console.log('selects:', await sels.count(), await sels.nth(0).locator('option').allInnerTexts());
await sels.nth(1).selectOption({ label: /Demonstra/ }).catch(async () => { const ops = await sels.nth(1).locator('option').allInnerTexts(); console.log('opcoes clinica:', ops); const alvo = ops.find((o) => /Demonstra/.test(o)); if (alvo) await sels.nth(1).selectOption({ label: alvo }); });
await foto(page, 'cadastro/01-super-admin-novo-admin-preenchido.png');
await d.getByRole('button', { name: /criar usuário/i }).click();
await page.waitForTimeout(1500);
await foto(page, 'cadastro/02-super-admin-apos-criar-admin.png');
const texto = await page.locator('body').innerText();
const m = texto.match(/\b[A-Z2-7]{26,}\b/);
console.log('resposta POST:', JSON.stringify(resposta), '| erros:', JSON.stringify(obs.erros));
console.log('segredo2fa exibido na tela:', m ? 'SIM (' + m[0].length + ' chars)' : 'nao encontrado');
console.log('texto dialog:', (await page.getByRole('dialog').allInnerTexts()).join(' || ').replace(/\s+/g, ' ').slice(0, 500));
if (m) { c.admin = { email: 'admin.demo@manual.nuvita.test', senha: 'AdminProvisoria#2026', segredo2fa: m[0] }; writeFileSync(caminho, JSON.stringify(c, null, 2)); }
await browser.close();
