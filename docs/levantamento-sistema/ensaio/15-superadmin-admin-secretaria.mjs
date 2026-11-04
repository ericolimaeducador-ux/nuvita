// Super Admin (usuários, clínicas, tickets), Admin (clínica/logo, notificações) e Secretária (cadastro, notificações).
import { abrir, observar, foto, fatos, entrar, lerContas, salvarResultado, BASE } from './lib.mjs';
const c = lerContas(process.env.CONTAS); const ids = c.ids;
const R = []; let page, obs, browser, ctx; const msgs = [];
async function sessao(conta) {
  if (browser) await browser.close();
  ({ browser, ctx } = await abrir({ altura: 860 })); page = await ctx.newPage(); obs = observar(page); page.on('dialog', async (d) => { msgs.push(d.message()); await d.dismiss(); });
  await entrar(page, conta);
}
async function passo(nome, fn) {
  obs.limpar(); msgs.length = 0;
  try { const extra = (await fn()) ?? {}; R.push({ nome, ok: true, ...extra, erros: obs.erros.filter((e) => e.status !== 401).map((e) => `${e.status} ${e.metodo} ${e.url}`.slice(0, 90)), confirms: [...msgs] }); console.log('OK   ', nome, obs.erros.length ? '| API ' + obs.erros.map((e) => e.status).join(',') : ''); }
  catch (e) { await foto(page, `falhas/${nome.replace(/\W+/g, '-')}.png`).catch(() => {}); R.push({ nome, ok: false, erro: e.message.split('\n')[0].slice(0, 160) }); console.log('FALHA', nome, '|', e.message.split('\n')[0].slice(0, 140)); }
}
const ir = async (rota) => { await page.goto(BASE + rota); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900); };

// ---------------- SUPER ADMIN ----------------
await sessao(c.superAdmin);
await passo('sa-usuarios', async () => { await ir('/super-admin'); await foto(page, 'super-admin/02-usuarios.png', { fullPage: true }); const f = await fatos(page); return { botoes: f.botoes, campos: f.campos }; });
await passo('sa-linha-acoes', async () => {
  const linha = page.locator('tr', { hasText: 'psicologa.demo@manual.nuvita.test' }).first();
  const bts = await linha.getByRole('button').evaluateAll((els) => els.map((e) => e.getAttribute('title') || e.getAttribute('aria-label') || e.textContent.trim()));
  return { botoesDaLinha: bts };
});
await passo('sa-editar-usuario', async () => {
  const linha = page.locator('tr', { hasText: 'psicologa.demo@manual.nuvita.test' }).first();
  await linha.getByTitle(/editar/i).first().click(); await page.waitForTimeout(700); await foto(page, 'super-admin/03-editar-usuario.png');
  const labels = await page.getByRole('dialog').locator('label').allInnerTexts();
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  return { labels, fechouComEsc: !(await page.getByRole('dialog').isVisible().catch(() => false)) };
});
await passo('sa-redefinir-senha-e-2fa', async () => {
  const linha = page.locator('tr', { hasText: 'psicologa.demo@manual.nuvita.test' }).first();
  const t = linha.getByTitle(/redefinir senha|senha/i).first(); const out = {};
  if (await t.count()) { await t.click(); await page.waitForTimeout(600); await foto(page, 'super-admin/04-redefinir-senha.png'); out.senhaDialogo = (await page.getByRole('dialog').innerText()).replace(/\s+/g, ' ').slice(0, 300); await page.keyboard.press('Escape'); await page.waitForTimeout(300); }
  const f = linha.getByTitle(/2fa|escudo|segundo fator/i).first();
  if (await f.count()) { await f.click(); await page.waitForTimeout(600); await foto(page, 'super-admin/05-reset-2fa.png'); out.doisFaDialogo = (await page.getByRole('dialog').innerText()).replace(/\s+/g, ' ').slice(0, 300); await page.keyboard.press('Escape'); }
  return out;
});
await passo('sa-clinicas', async () => { await page.getByRole('tab', { name: 'Clínicas' }).click(); await page.waitForTimeout(800); await foto(page, 'super-admin/06-clinicas.png', { fullPage: true }); const f = await fatos(page); return { botoes: f.botoes }; });
await passo('sa-nova-clinica-dialog', async () => { await page.getByRole('button', { name: /nova clínica/i }).first().click(); await page.waitForTimeout(700); await foto(page, 'super-admin/07-nova-clinica.png'); return { labels: await page.getByRole('dialog').locator('label').allInnerTexts() }; });
await passo('sa-editar-clinica', async () => {
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.getByTitle('Editar').first().click(); await page.waitForTimeout(700); await foto(page, 'super-admin/08-editar-clinica.png');
  return { labels: await page.getByRole('dialog').locator('label').allInnerTexts() };
});
await passo('sa-tickets', async () => { await ir('/tickets'); await foto(page, 'tickets/03-lista-super-admin.png', { fullPage: true }); const f = await fatos(page); return { botoes: f.botoes, texto: (await page.locator('main').first().innerText()).replace(/\s+/g, ' ').slice(0, 500) }; });
await passo('sa-ticket-atender-dialog', async () => {
  const b = page.getByRole('button', { name: /atender ticket|atender/i }).first(); if (!(await b.count())) return { semTicket: true };
  await b.click(); await page.waitForTimeout(700); await foto(page, 'tickets/04-atender-dialog.png');
  return { dialogo: (await page.getByRole('dialog').innerText()).replace(/\s+/g, ' ').slice(0, 500) };
});

// ---------------- ADMIN ----------------
await sessao(c.admin);
await passo('admin-clinica', async () => { await ir('/clinica'); await foto(page, 'clinica/01-clinica-admin.png', { fullPage: true }); return { botoes: (await fatos(page)).botoes }; });
await passo('admin-logo-dialog', async () => { await page.getByRole('button', { name: /adicionar logo|alterar logo/i }).first().click(); await page.waitForTimeout(700); await foto(page, 'clinica/02-logo-dialog.png'); return { dialogo: (await page.getByRole('dialog').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300) }; });
await passo('admin-notificacoes', async () => { await ir('/notificacoes'); await foto(page, 'notificacoes/01-notificacoes-admin.png', { fullPage: true }); return { f: await fatos(page), texto: (await page.locator('main').first().innerText()).replace(/\s+/g, ' ').slice(0, 500) }; });
await passo('admin-financeiro-psi-por-url', async () => { await ir('/financeiro-psicologia'); return { urlFinal: page.url().replace(BASE, '') }; });

// ---------------- SECRETÁRIA ----------------
await sessao(c.secretaria);
await passo('sec-primeiro-acesso', async () => { await ir('/dashboard'); await foto(page, 'perfis/secretaria/01-dashboard.png'); return { urlAposLogin: page.url().replace(BASE, ''), deveTrocarSenha: 'ver DB' }; });
await passo('sec-cadastrar-paciente', async () => {
  await ir('/pacientes'); await page.getByRole('button', { name: /novo paciente|cadastrar paciente/i }).first().click(); await page.waitForTimeout(500);
  const d = page.getByRole('dialog'); await d.locator('#nome').fill('Paciente Secretária Demonstração'); await d.locator('#dataNascimento').fill('1992-02-02');
  await foto(page, 'pacientes/20-secretaria-cadastro.png');
  await d.getByRole('button', { name: /^cadastrar/i }).click(); await page.waitForTimeout(1500); await foto(page, 'pacientes/21-secretaria-cadastrado.png');
  return { dialogoFechou: !(await d.isVisible().catch(() => false)) };
});
await passo('sec-notificacoes', async () => { await ir('/notificacoes'); await foto(page, 'notificacoes/02-notificacoes-secretaria.png', { fullPage: true }); return { texto: (await page.locator('main').first().innerText()).replace(/\s+/g, ' ').slice(0, 500) }; });
await passo('sec-ficha-secoes', async () => { await ir(`/pacientes/${ids.pacienteId}`); await foto(page, 'pacientes/22-secretaria-ficha.png', { fullPage: true }); return { botoes: (await fatos(page)).botoes }; });
await passo('sec-agenda', async () => { await ir('/agenda'); await foto(page, 'agenda/10-secretaria-agenda.png'); return { botoes: (await fatos(page)).botoes.slice(0, 8) }; });
salvarResultado('15-superadmin-admin-secretaria', R);
await browser.close();
