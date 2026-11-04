// Psicólogo: registrar+assinar sessão (evolução), financeiro (preço, cobrança, recebimento), pedido de correção.
import { abrir, observar, foto, fatos, entrar, lerContas, salvarResultado, BASE } from './lib.mjs';
const c = lerContas(process.env.CONTAS); const ids = c.ids;
const { browser, ctx } = await abrir({ altura: 860 });
const page = await ctx.newPage(); const obs = observar(page);
const R = []; const msgs = [];
page.on('dialog', async (d) => { msgs.push(d.message()); await d.accept(); });
async function passo(nome, fn) {
  if (process.env.SO && !nome.startsWith(process.env.SO)) return;
  obs.limpar(); msgs.length = 0;
  try { const extra = (await fn()) ?? {}; R.push({ nome, ok: true, ...extra, erros: obs.erros.map((e) => `${e.status} ${e.metodo} ${e.url.replace(ids.pacienteId, ':pac')}`.slice(0, 90)), confirms: [...msgs] }); console.log('OK   ', nome, obs.erros.length ? '| API ' + obs.erros.map((e) => e.status).join(',') : ''); }
  catch (e) { await foto(page, `falhas/${nome.replace(/\W+/g, '-')}.png`).catch(() => {}); R.push({ nome, ok: false, erro: e.message.split('\n')[0].slice(0, 160) }); console.log('FALHA', nome, '|', e.message.split('\n')[0].slice(0, 140)); }
}
const ir = async (rota) => { await page.goto(BASE + rota); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900); };
const toasts = async () => (await page.locator('[role=status], li[data-state=open]').allInnerTexts()).join(' | ').replace(/\s+/g, ' ').slice(0, 240);
await entrar(page, c.psicologo);

await passo('sessao-registrar-e-assinar', async () => {
  await ir('/atendimento-psicologico');
  await page.getByRole('button', { name: /^prontuário/i }).first().click(); await page.waitForTimeout(900);
  const d = page.getByRole('dialog');
  await d.locator('label', { hasText: /^Motivo do atendimento/ }).locator('xpath=following::textarea[1]').fill('Motivo fictício da sessão de ensaio.');
  await d.locator('label', { hasText: /^Evolução|Registro da evolução/ }).first().locator('xpath=following::textarea[1]').fill('Evolução fictícia registrada durante o ensaio.');
  await foto(page, 'atendimento/07-registro-preenchido.png');
  await d.getByRole('button', { name: /salvar e assinar/i }).click(); await page.waitForTimeout(2000);
  await foto(page, 'atendimento/08-apos-salvar-e-assinar.png');
  return { toast: await toasts(), dialogoFechou: !(await d.isVisible().catch(() => false)) };
});
await passo('sessao-aparece-na-ficha', async () => {
  await ir(`/pacientes/${ids.pacienteId}`); await page.getByRole('button', { name: /^Prontuários e atendimentos/ }).first().click().catch(() => {}); await page.waitForTimeout(700);
  await foto(page, 'atendimento/09-ficha-prontuarios.png', { fullPage: true });
  const linhas = page.locator('table tbody tr'); const n = await linhas.count();
  if (n) { await linhas.first().click().catch(() => {}); await page.waitForTimeout(900); await foto(page, 'atendimento/10-prontuario-detalhe.png'); }
  return { linhas: n, dialogo: (await page.getByRole('dialog').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 500), botoesDialogo: await page.getByRole('dialog').getByRole('button').allInnerTexts().catch(() => []) };
});
await passo('financeiro-preco-e-cobranca', async () => {
  await ir('/financeiro-psicologia');
  const inp = page.locator('input[type=number]').first(); await inp.fill('150'); await page.getByRole('button', { name: /^salvar/i }).first().click(); await page.waitForTimeout(1000);
  const t1 = await toasts();
  await page.getByRole('button', { name: /cobrar ciclo/i }).first().click(); await page.waitForTimeout(600);
  const d = page.getByRole('dialog'); await foto(page, 'financeiro/03-cobranca-preenchida.png');
  await d.getByRole('button', { name: /criar cobrança/i }).click(); await page.waitForTimeout(1500); await foto(page, 'financeiro/04-apos-criar-cobranca.png', { fullPage: true });
  return { toastPreco: t1, toastCobranca: await toasts(), texto: (await page.locator('main').first().innerText()).replace(/\s+/g, ' ').slice(0, 600) };
});
await passo('financeiro-receber', async () => {
  const b = page.getByRole('button', { name: /receber|marcar como pago|registrar pagamento/i }).first();
  if (!(await b.count())) return { semBotaoReceber: true, botoes: (await fatos(page)).botoes };
  await b.click(); await page.waitForTimeout(900); await foto(page, 'financeiro/05-receber.png');
  return { dialogo: (await page.getByRole('dialog').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 300), toast: await toasts() };
});
await passo('ticket-solicitar-correcao-envio', async () => {
  await ir(`/pacientes/${ids.pacienteId}`); await page.getByTitle('Editar cadastro').click(); await page.waitForTimeout(500);
  await page.getByRole('dialog').getByRole('button', { name: /solicitar correção/i }).click(); await page.waitForTimeout(600);
  const d = page.getByRole('dialog'); await d.getByLabel('Justificativa').fill('Nome digitado errado no cadastro (texto fictício do ensaio).');
  await d.getByRole('button', { name: /enviar solicitação/i }).click(); await page.waitForTimeout(1500); await foto(page, 'tickets/01-solicitacao-enviada.png');
  await page.getByRole('button', { name: /^Dados cadastrais/ }).first().click().catch(() => {}); await page.waitForTimeout(600); await foto(page, 'tickets/02-ficha-com-solicitacao.png', { fullPage: true });
  return { toast: await toasts() };
});
salvarResultado('14-psicologo-sessao-financeiro-ticket', R);
await browser.close();
