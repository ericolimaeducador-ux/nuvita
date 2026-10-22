// Ensaio do primeiro acesso do PSICÓLOGO (login -> 2FA -> troca de senha -> termo -> dashboard).
import { abrir, observar, foto, fatos, salvarResultado, BASE, totp } from './lib.mjs';

const conta = { email: 'psicologa.demo@manual.nuvita.test', senha: 'DemoManual#2026', segredo2fa: process.env.SEGREDO_PSI };
const NOVA_SENHA = process.env.NOVA_SENHA;
if (!conta.segredo2fa || !NOVA_SENHA) throw new Error('defina SEGREDO_PSI e NOVA_SENHA');

const { browser, ctx } = await abrir();
const page = await ctx.newPage();
const obs = observar(page);
const passos = [];
const reg = async (nome, extra = {}) => { passos.push({ nome, ...(await fatos(page)), erros: [...obs.erros], ...extra }); obs.limpar(); };

await page.goto(BASE + '/login');
await foto(page, '02-onboarding/01-login.png');
await reg('login-vazio');

await page.getByLabel('E-mail').fill(conta.email);
await page.getByLabel('Senha', { exact: true }).fill(conta.senha);
await page.getByRole('button', { name: /entrar/i }).click();
await page.waitForTimeout(1500);
await foto(page, '02-onboarding/02-pede-2fa.png');
await reg('pede-2fa');

await page.getByLabel(/Código de verificação/).fill(totp(conta.segredo2fa));
await page.getByRole('button', { name: /entrar/i }).click();
await page.waitForLoadState('networkidle').catch(() => {});
await page.waitForTimeout(1200);
await foto(page, '02-onboarding/03-apos-2fa.png');
await reg('apos-2fa');

for (let volta = 0; volta < 4; volta++) {
  if (page.url().includes('/aceitar-termos')) {
    await foto(page, '02-onboarding/04-termo.png', { fullPage: false });
    await reg('termo');
    await page.getByRole('button', { name: /aceitar|confirmar|continuar/i }).first().click({ trial: true }).catch(() => {});
    await page.getByRole('checkbox').first().check();
    await foto(page, '02-onboarding/05-termo-marcado.png');
    await page.getByRole('button', { name: /aceitar|confirmar|continuar/i }).first().click();
  } else if (page.url().includes('/definir-senha')) {
    const senhas = page.locator('input[type=password]');
    const n = await senhas.count();
    await foto(page, '02-onboarding/06-definir-senha.png');
    for (let i = 0; i < n; i++) await senhas.nth(i).fill('curta');
    await page.getByRole('button', { name: /salvar|definir|confirmar|continuar/i }).first().click();
    await page.waitForTimeout(900);
    await foto(page, '02-onboarding/07-senha-fraca-erro.png');
    await reg('senha-fraca', { camposSenha: n, texto: (await page.locator('body').innerText()).slice(0, 600) });
    for (let i = 0; i < n; i++) await senhas.nth(i).fill(NOVA_SENHA);
    await page.getByRole('button', { name: /salvar|definir|confirmar|continuar/i }).first().click();
  } else break;
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1200);
}
await foto(page, '02-onboarding/09-destino-final.png');
await reg('destino-final');
salvarResultado('01-onboarding-psicologo', passos);
console.log(passos.map((p) => `${p.nome}: ${p.url} | h: ${p.titulos.join(' / ')} | erros: ${p.erros.map((e) => e.status + ' ' + e.url).join(', ')}`).join('\n'));
await browser.close();
