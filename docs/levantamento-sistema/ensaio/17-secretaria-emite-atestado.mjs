// A secretária consegue EMITIR um atestado clínico pela URL? (tela de composição de documento clínico)
import { abrir, observar, foto, entrar, lerContas, salvarResultado, BASE } from './lib.mjs';
const c = lerContas(process.env.CONTAS); const ids = c.ids;
const { browser, ctx } = await abrir({ altura: 860 }); const page = await ctx.newPage(); const obs = observar(page);
await entrar(page, c.secretaria);
await page.goto(`${BASE}/pacientes/${ids.pacienteId}/documentos/atestado`); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(800);
await foto(page, 'seguranca/01-secretaria-atestado-compor.png');
const di = page.locator('input[type=datetime-local], input[type=date], input[type=time]').first();
if (await di.count()) { const t = await di.getAttribute('type'); await di.fill(t === 'datetime-local' ? '2026-10-22T14:00' : t === 'time' ? '14:00' : '2026-10-22'); }
await page.getByRole('button', { name: /^gerar atestado/i }).click(); await page.waitForTimeout(1500);
await foto(page, 'seguranca/02-secretaria-atestado-emitido.png', { fullPage: true });
const R = { texto: (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 520), botoes: await page.getByRole('button').allInnerTexts(), erros: obs.erros.map((e) => `${e.status} ${e.metodo} ${e.url.replace(ids.pacienteId, ':pac')}`) };
salvarResultado('17-secretaria-emite-atestado', R); console.log(JSON.stringify(R, null, 1));
await browser.close();
