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
const GERAR = { atestado: /^gerar atestado/i, laudo: /^gerar laudo/i, encaminhamento: /^gerar encaminhamento/i, prescricao: /^gerar prescrição/i };
for (const slug of ['atestado', 'laudo', 'encaminhamento', 'prescricao']) {
  await passo(`emitir-${slug}`, async () => {
    await ir(`/pacientes/${ids.pacienteId}/documentos/${slug}`);
    const antes = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    // campos mínimos de cada documento
    if (slug === 'atestado') { const di = page.locator('input[type=datetime-local], input[type=date], input[type=time]').first(); if (await di.count()) { const t = await di.getAttribute('type'); await di.fill(t === 'datetime-local' ? '2026-10-22T14:00' : t === 'time' ? '14:00' : '2026-10-22'); } }
    if (slug === 'encaminhamento') { const ins = page.locator('input[type=text], input:not([type])'); if (await ins.count()) await ins.first().fill('Psiquiatra (fictício)'); const ta = page.locator('textarea'); if (await ta.count()) await ta.first().fill('Motivo fictício do encaminhamento.'); }
    await page.getByRole('button', { name: GERAR[slug] }).click(); await page.waitForTimeout(1500);
    await foto(page, `documentos-clinicos/${slug}-3-emitido.png`, { fullPage: true });
    const texto = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    const bytes = await imprimir(slug);
    return { toast: await toasts(), mudouDeTela: texto !== antes, botoes: (await fatos(page)).botoes, textoEmitido: texto.slice(0, 420), pdfBytes: bytes };
  });
}
await passo('prescricao-ia-sem-chave', async () => {
  await ir(`/pacientes/${ids.pacienteId}/documentos/prescricao`);
  await page.getByRole('button', { name: /gerar com ia/i }).click(); await page.waitForTimeout(1500); await foto(page, 'documentos-clinicos/prescricao-4-ia-sem-chave.png');
  return { toast: await toasts() };
});
await passo('ficha-upload-documento', async () => {
  await ir(`/pacientes/${ids.pacienteId}`);
  await page.getByRole('button', { name: /^Documentos\b/ }).first().click(); await page.waitForTimeout(400);
  await page.getByRole('button', { name: /novo documento/i }).first().click(); await page.waitForTimeout(500);
  const d = page.getByRole('dialog'); await foto(page, 'documentos/02-novo-documento.png');
  await d.getByPlaceholder(/título/i).fill('Documento fictício');
  await d.locator('input[type=file]').setInputFiles({ name: 'fake.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 ficticio') });
  await d.getByRole('button', { name: /enviar documento/i }).click(); await page.waitForTimeout(3000); await foto(page, 'documentos/03-upload-resultado.png');
  return { toast: await toasts(), dialogoAindaAberto: await d.isVisible().catch(() => false) };
});
await passo('agenda-lista-amanha-menu', async () => {
  await ir('/agenda'); await page.getByRole('button', { name: /^lista/i }).first().click(); await page.waitForTimeout(500);
  const di = page.locator('input[type=date]').first(); if (await di.count()) { const d = new Date(); d.setDate(d.getDate() + 1); await di.fill(d.toISOString().slice(0, 10)); await page.waitForTimeout(800); }
  await foto(page, 'agenda/02b-lista-amanha.png');
  const m = page.locator('button[aria-haspopup=menu]').first(); const tem = await m.count(); if (tem) { await m.click(); await page.waitForTimeout(400); await foto(page, 'agenda/04-menu-agendamento.png'); }
  return { temMenu: tem > 0, itens: tem ? await page.getByRole('menuitem').allInnerTexts() : [], f: (await fatos(page)).botoes.slice(0, 12) };
});
await passo('telemedicina-criar-sala-ui', async () => {
  await ir('/telemedicina'); await page.getByRole('button', { name: /nova sala/i }).first().click(); await page.waitForTimeout(500);
  const d = page.getByRole('dialog'); await d.getByRole('combobox').first().click(); await page.waitForTimeout(400);
  const ops = await page.getByRole('option').allInnerTexts(); await foto(page, 'telemedicina/04-nova-sala-agendamentos.png');
  if (ops.length) await page.getByRole('option').first().click();
  await d.getByRole('button', { name: /criar sala|criar/i }).last().click(); await page.waitForTimeout(1800); await foto(page, 'telemedicina/05-sala-criada.png', { fullPage: true });
  return { opcoes: ops, texto: (await page.locator('main').first().innerText()).replace(/\s+/g, ' ').slice(0, 420), toast: await toasts() };
});
salvarResultado('12-psicologo-modulos-c', R);
await browser.close();
