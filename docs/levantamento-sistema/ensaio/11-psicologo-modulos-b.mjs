// Ensaio dos módulos como PSICÓLOGO, parte B (agenda, atendimento, financeiro, relatórios, documentos,
// telemedicina, documentos clínicos/impressão). Local, dados fictícios. Cada passo é isolado.
import { abrir, observar, foto, fatos, entrar, lerContas, salvarResultado, BASE, SHOTS } from './lib.mjs';
import { mkdirSync } from 'fs';
import { join } from 'path';

const c = lerContas(process.env.CONTAS); const ids = c.ids;
const { browser, ctx } = await abrir({ altura: 860 });
const page = await ctx.newPage(); const obs = observar(page);
const R = [];
const msgsDialogo = [];
page.on('dialog', async (d) => { msgsDialogo.push(d.message()); await d.dismiss(); });
async function passo(nome, fn) {
  obs.limpar(); msgsDialogo.length = 0;
  try {
    const extra = (await fn()) ?? {};
    R.push({ nome, ok: true, ...extra, erros: obs.erros.map((e) => `${e.status} ${e.metodo} ${e.url.replace(ids.pacienteId, ':pac').replace(ids.pacienteId2, ':pac2')}`.slice(0, 90)), confirms: [...msgsDialogo] });
    console.log('OK   ', nome, obs.erros.length ? '| API ' + obs.erros.map((e) => e.status).join(',') : '');
  } catch (e) {
    await foto(page, `falhas/${nome.replace(/\W+/g, '-')}.png`).catch(() => {});
    R.push({ nome, ok: false, erro: e.message.split('\n')[0].slice(0, 160) });
    console.log('FALHA', nome, '|', e.message.split('\n')[0].slice(0, 120));
  }
}
const ir = async (rota) => { await page.goto(BASE + rota); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900); };
const toasts = async () => (await page.locator('[role=status], li[data-state=open]').allInnerTexts()).join(' | ').replace(/\s+/g, ' ').slice(0, 220);
await entrar(page, c.psicologo);

// ---------- Agenda ----------
await passo('agenda-calendario', async () => { await ir('/agenda'); await foto(page, 'agenda/01-calendario.png'); return { f: await fatos(page) }; });
await passo('agenda-lista', async () => { const b = page.getByRole('button', { name: /lista/i }).first(); if (await b.count()) await b.click(); await page.waitForTimeout(600); await foto(page, 'agenda/02-lista.png'); return { f: await fatos(page) }; });
await passo('agenda-novo-dialog', async () => { await page.getByRole('button', { name: /novo agendamento/i }).first().click(); await page.waitForTimeout(600); await foto(page, 'agenda/03-novo-agendamento.png'); return { campos: await page.getByRole('dialog').locator('label').allInnerTexts() }; });
await passo('regressao-agenda-novo', async () => {
  const d = page.getByRole('dialog'); await d.locator('#fObs').fill('Observação que não pode se perder');
  await page.mouse.click(5, 5); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const aberto = await d.isVisible(); const v = await d.locator('#fObs').inputValue();
  await d.getByRole('button', { name: /^cancelar/i }).click(); await page.waitForTimeout(300);
  return { aposForaEEsc_aberto: aberto, textoPreservado: v.startsWith('Observação'), cancelarPediuConfirmacao: msgsDialogo.length > 0 };
});
await passo('agenda-menu-linha', async () => {
  await ir('/agenda'); const b = page.getByRole('button', { name: /lista/i }).first(); if (await b.count()) await b.click(); await page.waitForTimeout(500);
  await page.locator('button[aria-haspopup=menu]').first().click(); await page.waitForTimeout(400); await foto(page, 'agenda/04-menu-agendamento.png');
  return { itens: await page.getByRole('menuitem').allInnerTexts() };
});

// ---------- Atendimento psicológico ----------
await passo('atendimento-painel', async () => { await ir('/atendimento-psicologico'); await foto(page, 'atendimento/01-painel.png', { fullPage: true }); return { f: await fatos(page) }; });
await passo('atendimento-registro-dialog', async () => {
  await page.getByRole('button', { name: /^prontuário/i }).first().click(); await page.waitForTimeout(900); await foto(page, 'atendimento/02-registro-sessao.png');
  return { labels: (await page.getByRole('dialog').locator('label').allInnerTexts()).slice(0, 40), botoes: await page.getByRole('dialog').getByRole('button').allInnerTexts() };
});
await passo('atendimento-ia-sem-chave', async () => {
  await page.getByRole('button', { name: /sugerir abordagem/i }).click(); await page.waitForTimeout(1500); await foto(page, 'atendimento/03-ia-sem-chave.png');
  return { toast: await toasts() };
});
await passo('regressao-atendimento-registro', async () => {
  const d = page.getByRole('dialog'); await d.locator('textarea').first().fill('Anotação clínica fictícia que não pode se perder');
  await page.mouse.click(5, 5); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const aberto = await d.isVisible(); await d.getByRole('button', { name: /^fechar/i }).click(); await page.waitForTimeout(300);
  return { aposForaEEsc_aberto: aberto, fecharPediuConfirmacao: msgsDialogo.length > 0 };
});
await passo('atendimento-historico', async () => { await ir('/atendimento-psicologico'); await page.getByRole('button', { name: /histórico/i }).first().click(); await page.waitForTimeout(900); await foto(page, 'atendimento/04-historico-sessoes.png'); return { texto: (await page.getByRole('dialog').innerText()).replace(/\s+/g, ' ').slice(0, 300) }; });
await passo('atendimento-novo-agendamento-psi', async () => { await ir('/atendimento-psicologico'); await page.getByRole('button', { name: /novo agendamento/i }).first().click(); await page.waitForTimeout(600); await foto(page, 'atendimento/05-novo-agendamento-psicologico.png'); return { labels: await page.getByRole('dialog').locator('label').allInnerTexts() }; });
await passo('atendimento-atender', async () => {
  await ir('/atendimento-psicologico'); await page.getByRole('button', { name: /^atender/i }).first().click(); await page.waitForTimeout(2500); await foto(page, 'atendimento/06-atender.png');
  return { url: page.url().replace(BASE, ''), texto: (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 260) };
});

// ---------- Financeiro ----------
await passo('financeiro-painel', async () => { await ir('/financeiro-psicologia'); await foto(page, 'financeiro/01-painel.png', { fullPage: true }); return { f: await fatos(page), texto: (await page.locator('main').first().innerText()).replace(/\s+/g, ' ').slice(0, 500) }; });
await passo('financeiro-cobrar-ciclo', async () => { const b = page.getByRole('button', { name: /cobrar ciclo/i }).first(); if (!(await b.count())) return { semBotao: true }; await b.click(); await page.waitForTimeout(600); await foto(page, 'financeiro/02-cobrar-ciclo.png'); return { texto: (await page.getByRole('dialog').innerText()).replace(/\s+/g, ' ').slice(0, 350) }; });

// ---------- Relatórios ----------
await passo('relatorios', async () => { await ir('/relatorios'); await foto(page, 'relatorios/01-relatorios.png', { fullPage: true }); return { f: await fatos(page) }; });

// ---------- Documentos (upload) ----------
await passo('documentos-lista', async () => { await ir('/documentos'); await foto(page, 'documentos/01-lista.png'); return { f: await fatos(page) }; });
await passo('documentos-upload', async () => {
  await page.getByRole('button', { name: /novo documento/i }).first().click().catch(() => {}); await page.waitForTimeout(500);
  const d = page.getByRole('dialog'); await foto(page, 'documentos/02-novo-documento.png');
  await d.getByPlaceholder(/título/i).fill('Documento fictício');
  await d.locator('input[type=file]').setInputFiles({ name: 'fake.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 ficticio') });
  await d.getByRole('button', { name: /enviar documento/i }).click(); await page.waitForTimeout(2500); await foto(page, 'documentos/03-upload-resultado.png');
  return { toast: await toasts() };
});

// ---------- Telemedicina ----------
await passo('telemedicina-tela', async () => { await ir('/telemedicina'); await foto(page, 'telemedicina/02-tela.png', { fullPage: true }); return { f: await fatos(page) }; });
await passo('telemedicina-nova-sala', async () => { await page.getByRole('button', { name: /nova sala/i }).first().click(); await page.waitForTimeout(600); await foto(page, 'telemedicina/03-nova-sala.png'); return { labels: await page.getByRole('dialog').locator('label').allInnerTexts() }; });

// ---------- Documentos clínicos + impressão ----------
for (const slug of ['atestado', 'laudo', 'encaminhamento', 'prescricao']) {
  await passo(`doc-${slug}`, async () => {
    await ir(`/pacientes/${ids.pacienteId}/documentos/${slug}`); await foto(page, `documentos-clinicos/${slug}-1-compor.png`, { fullPage: true });
    const compor = await fatos(page);
    const b = page.getByRole('button', { name: /pré-?visualizar|visualizar|gerar documento|emitir|imprimir|prévia/i }).first();
    let abriuPrevia = false; if (await b.count()) { await b.click().catch(() => {}); await page.waitForTimeout(900); abriuPrevia = true; }
    await foto(page, `documentos-clinicos/${slug}-2-previa.png`, { fullPage: true });
    mkdirSync(join(SHOTS, 'documentos-clinicos'), { recursive: true });
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({ path: join(SHOTS, 'documentos-clinicos', `${slug}.pdf`), format: 'A4', printBackground: true });
    await page.emulateMedia({ media: 'screen' });
    return { botoesCompor: compor.botoes, abriuPrevia, pdfBytes: pdf.length, texto: (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 300) };
  });
}
await passo('logout', async () => { await ir('/dashboard'); await page.getByRole('button', { name: /^sair/i }).first().click(); await page.waitForTimeout(1200); await foto(page, 'perfis/psicologo/zz-apos-sair.png'); return { url: page.url().replace(BASE, '') }; });
salvarResultado('11-psicologo-modulos-b', R);
await browser.close();
