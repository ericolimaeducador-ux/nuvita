// Ensaio PSICÓLOGO, parte C: documentos clínicos gerados + impressão (PDF), upload pela ficha,
// menu de agendamento, telemedicina (criar sala). Local, dados fictícios.
import { abrir, observar, foto, fatos, entrar, lerContas, salvarResultado, BASE, SHOTS } from './lib.mjs';
import { mkdirSync } from 'fs';
import { join } from 'path';

const c = lerContas(process.env.CONTAS); const ids = c.ids;
const { browser, ctx } = await abrir({ altura: 860 });
const page = await ctx.newPage(); const obs = observar(page);
const R = []; const msgs = [];
page.on('dialog', async (d) => { msgs.push(d.message()); await d.dismiss(); });
async function passo(nome, fn) {
  obs.limpar(); msgs.length = 0;
  try { const extra = (await fn()) ?? {}; R.push({ nome, ok: true, ...extra, erros: obs.erros.map((e) => `${e.status} ${e.metodo} ${e.url.replace(ids.pacienteId, ':pac')}`.slice(0, 90)), confirms: [...msgs] }); console.log('OK   ', nome, obs.erros.length ? '| API ' + obs.erros.map((e) => e.status).join(',') : ''); }
  catch (e) { await foto(page, `falhas/${nome.replace(/\W+/g, '-')}.png`).catch(() => {}); R.push({ nome, ok: false, erro: e.message.split('\n')[0].slice(0, 160) }); console.log('FALHA', nome, '|', e.message.split('\n')[0].slice(0, 140)); }
}
const ir = async (rota) => { await page.goto(BASE + rota); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900); };
const toasts = async () => (await page.locator('[role=status], li[data-state=open]').allInnerTexts()).join(' | ').replace(/\s+/g, ' ').slice(0, 240);
await entrar(page, c.psicologo);
mkdirSync(join(SHOTS, 'documentos-clinicos'), { recursive: true });

async function imprimir(slug) {
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ path: join(SHOTS, 'documentos-clinicos', `${slug}-emitido.pdf`), format: 'A4', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  return pdf.length;
}
const GERAR = { laudo: /^gerar laudo/i, prescricao: /^gerar prescrição/i };
for (const slug of ['laudo', 'prescricao']) {
  await passo(`emitir-${slug}`, async () => {
    await ir(`/pacientes/${ids.pacienteId}/documentos/${slug}`);
    if (slug === 'laudo') await page.locator('textarea').first().fill('Texto fictício de laudo psicoterápico para o ensaio.');
    if (slug === 'prescricao') { await page.getByRole('checkbox').first().check(); await page.locator('textarea').first().fill('Orientação fictícia de cuidados.'); }
    await page.getByRole('button', { name: GERAR[slug] }).click(); await page.waitForTimeout(1500);
    await foto(page, `documentos-clinicos/${slug}-3-emitido.png`, { fullPage: true });
    const texto = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    const bytes = await imprimir(slug);
    return { botoes: (await fatos(page)).botoes, textoEmitido: texto.slice(0, 460), pdfBytes: bytes };
  });
}
salvarResultado('13-docs-laudo-prescricao', R);
await browser.close();
