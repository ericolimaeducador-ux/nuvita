// Ensaio dos módulos como PSICÓLOGO (local, dados fictícios). Cada passo é isolado: se falha, registra e segue.
import { abrir, observar, foto, fatos, entrar, lerContas, salvarResultado, BASE } from './lib.mjs';
const c = lerContas(process.env.CONTAS); const ids = c.ids;
const { browser, ctx } = await abrir({ altura: 860 });
await ctx.grantPermissions([], { origin: BASE });
const page = await ctx.newPage(); const obs = observar(page);
const R = [];
const msgsDialogo = [];
let aceitarConfirm = false;
page.on('dialog', async (d) => { msgsDialogo.push(d.message()); if (aceitarConfirm) await d.accept(); else await d.dismiss(); });
async function passo(nome, fn) {
  obs.limpar(); msgsDialogo.length = 0;
  try { const extra = (await fn()) ?? {}; R.push({ nome, ok: true, ...extra, erros: obs.erros.map((e) => `${e.status} ${e.metodo} ${e.url.replace(ids.pacienteId, ':pac').replace(ids.pacienteId2, ':pac2')}`.slice(0, 80)), confirms: [...msgsDialogo] }); console.log('OK  ', nome, obs.erros.length ? '| API ' + obs.erros.map((e) => e.status).join(',') : ''); }
  catch (e) { await foto(page, `falhas/${nome.replace(/\W+/g, '-')}.png`).catch(() => {}); R.push({ nome, ok: false, erro: e.message.split('\n')[0].slice(0, 160) }); console.log('FALHA', nome, '|', e.message.split('\n')[0].slice(0, 120)); }
}
const ir = async (rota) => { await page.goto(BASE + rota); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(900); };
await entrar(page, c.psicologo);

// ---------- Pacientes ----------
await passo('pacientes-lista', async () => { await ir('/pacientes'); await foto(page, 'pacientes/01-lista.png'); return { f: await fatos(page) }; });
await passo('pacientes-novo-dialog', async () => {
  await page.getByRole('button', { name: /novo paciente|cadastrar paciente/i }).first().click(); await page.waitForTimeout(600);
  await foto(page, 'pacientes/02-novo-paciente-dialog.png'); return { campos: (await page.getByRole('dialog').locator('label').allInnerTexts()) };
});
await passo('pacientes-menor-sem-responsavel', async () => {
  const d = page.getByRole('dialog');
  await d.locator('#nome').fill('Criança Exemplo Demonstração');
  await d.locator('#dataNascimento').fill('2016-03-10');
  await page.waitForTimeout(500);
  await foto(page, 'pacientes/03-menor-campos-responsavel.png');
  await d.getByRole('button', { name: /^cadastrar/i }).click(); await page.waitForTimeout(900);
  await foto(page, 'pacientes/04-menor-sem-responsavel-validacao.png');
  return { erros_tela: (await d.locator('.text-destructive, [role=alert], p.text-sm.text-destructive').allInnerTexts()).slice(0, 8), aindaAberto: await d.isVisible() };
});
await passo('pacientes-menor-com-responsavel', async () => {
  const d = page.getByRole('dialog');
  await d.locator('#responsavelNome').fill('Responsável Exemplo Demonstração');
  await d.locator('#responsavelCpf').fill('111.444.777-35');
  await d.locator('#responsavelTelefone').fill('(11) 90000-0009');
  await d.locator('#responsavelEmail').fill('responsavel@manual.nuvita.test');
  await d.locator('#responsavelVinculo').fill('mãe');
  const chks = d.getByRole('checkbox'); const n = await chks.count();
  for (let i = 0; i < n; i++) if (!(await chks.nth(i).isChecked())) await chks.nth(i).check();
  await foto(page, 'pacientes/05-menor-responsavel-preenchido.png');
  await d.getByRole('button', { name: /^cadastrar/i }).click(); await page.waitForTimeout(1500);
  await foto(page, 'pacientes/06-menor-cadastrado.png');
  return { dialogFechou: !(await d.isVisible().catch(() => false)), checkboxes: n };
});
await passo('regressao-novo-paciente', async () => {
  await ir('/pacientes');
  await page.getByRole('button', { name: /novo paciente|cadastrar paciente/i }).first().click(); await page.waitForTimeout(500);
  const d = page.getByRole('dialog'); await d.locator('#nome').fill('Texto digitado que não pode se perder');
  await page.mouse.click(5, 5); await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  const aberto = await d.isVisible(); const valor = await d.locator('#nome').inputValue();
  await d.getByRole('button', { name: /cancelar/i }).click(); await page.waitForTimeout(400);
  const aindaAbertoAposCancelarRecusado = await d.isVisible();
  return { aposForaEEsc_aberto: aberto, aposForaEEsc_textoPreservado: valor === 'Texto digitado que não pode se perder', cancelarComTexto_pediuConfirmacao: msgsDialogo.length > 0, cancelarRecusado_mantemAberto: aindaAbertoAposCancelarRecusado };
});

// ---------- Ficha do paciente ----------
await passo('ficha-aberta', async () => { await ir(`/pacientes/${ids.pacienteId}`); await foto(page, 'pacientes/10-ficha-recolhida.png'); return { f: await fatos(page) }; });
await passo('ficha-expandir-tudo', async () => {
  for (const t of ['Dados cadastrais', 'Prontuários e atendimentos', 'Documentos clínicos', 'Documentos', 'Testes Psicológicos']) { const b = page.getByRole('button', { name: new RegExp('^' + t) }).first(); if (await b.count()) await b.click().catch(() => {}); }
  await page.waitForTimeout(700); await foto(page, 'pacientes/11-ficha-expandida.png', { fullPage: true });
  return { botoes: (await fatos(page)).botoes };
});
await passo('ficha-editar-cadastro-lapis', async () => {
  await page.getByTitle('Editar cadastro').click(); await page.waitForTimeout(600); await foto(page, 'pacientes/12-editar-cadastro.png');
  return { campos: await page.getByRole('dialog').locator('label').allInnerTexts() };
});
await passo('regressao-editar-cadastro', async () => {
  const d = page.getByRole('dialog'); await d.getByLabel('Telefone').fill('11888887777');
  await page.mouse.click(5, 5); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const aberto = await d.isVisible(); const valor = await d.getByLabel('Telefone').inputValue();
  await d.getByRole('button', { name: /^cancelar/i }).click(); await page.waitForTimeout(300);
  return { aposForaEEsc_aberto: aberto, aposForaEEsc_textoPreservado: valor === '11888887777', cancelarComEdicao_pediuConfirmacao: msgsDialogo.length > 0 };
});
await passo('ficha-solicitar-correcao', async () => {
  const d = page.getByRole('dialog'); await d.getByRole('button', { name: /solicitar correção/i }).click(); await page.waitForTimeout(400);
  const confirmou = msgsDialogo.length; // o diálogo nativo foi dispensado (recusa) -> continua no editar
  aceitarConfirm = true;
  await d.getByRole('button', { name: /solicitar correção/i }).click(); await page.waitForTimeout(700);
  aceitarConfirm = false;
  await foto(page, 'pacientes/13-solicitar-correcao.png');
  const sol = page.getByRole('dialog'); const j = sol.getByLabel('Justificativa'); await j.fill('Texto de justificativa fictício');
  await page.mouse.click(5, 5); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  return { pediuConfirmacaoComEdicaoPendente: confirmou > 0, solicitacao_aposForaEEsc_aberto: await sol.isVisible(), solicitacao_textoPreservado: (await j.inputValue()) === 'Texto de justificativa fictício' };
});
await passo('ficha-testes', async () => {
  await ir(`/pacientes/${ids.pacienteId}`);
  await page.getByRole('button', { name: /^Testes Psicológicos/ }).first().click(); await page.waitForTimeout(500); await foto(page, 'testes/01-secao-testes.png');
  await page.getByRole('button', { name: /aplicar teste/i }).click(); await page.waitForTimeout(500); await foto(page, 'testes/02-aplicar-teste-dialog.png');
  const d = page.getByRole('dialog'); await d.getByLabel('Nome do teste').fill('Teste fictício de ensaio'); await d.getByLabel(/Resultado/).fill('Resultado fictício');
  await page.mouse.click(5, 5); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  const aberto = await d.isVisible();
  await d.getByRole('button', { name: /registrar teste/i }).click(); await page.waitForTimeout(1200); await foto(page, 'testes/03-teste-registrado.png');
  return { aposForaEEsc_aberto: aberto };
});
await passo('ficha-testes-secao-recolhida', async () => {
  await ir(`/pacientes/${ids.pacienteId}`); // seção recolhida por padrão
  await page.getByRole('button', { name: /aplicar teste/i }).click(); await page.waitForTimeout(500);
  const abre = await page.getByRole('dialog').isVisible().catch(() => false); await foto(page, 'testes/04-aplicar-com-secao-recolhida.png');
  return { botaoAbreDialogComSecaoRecolhida: abre };
});
await passo('ficha-exportar-lgpd', async () => {
  await ir(`/pacientes/${ids.pacienteId}`);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), page.getByRole('button', { name: /exportar/i }).first().click()]);
  return { arquivo: dl.suggestedFilename() };
});

salvarResultado('10-psicologo-modulos-a', R);
await browser.close();
