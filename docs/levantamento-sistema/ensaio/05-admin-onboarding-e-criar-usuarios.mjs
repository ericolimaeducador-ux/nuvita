// Admin: primeiro acesso ponta a ponta + criação de psicólogo (com CRP) e secretária em /clinica.
import { abrir, observar, foto, entrarComGates, lerContas, BASE } from './lib.mjs';
import { writeFileSync } from 'fs';
const caminho = process.env.CONTAS; const c = lerContas(caminho);
const { browser, ctx } = await abrir();
const page = await ctx.newPage(); const obs = observar(page);
const dest = await entrarComGates(page, c.admin, 'AdminDefinitiva#2026x', 'onboarding-admin/01');
c.admin.senha = 'AdminDefinitiva#2026x'; writeFileSync(caminho, JSON.stringify(c, null, 2));
console.log('admin destino:', dest);
await page.goto(BASE + '/clinica'); await page.waitForLoadState('networkidle'); await page.waitForTimeout(800);
await foto(page, 'cadastro/03-clinica-tela.png', { fullPage: true });
console.log('botoes /clinica:', (await page.getByRole('button').allInnerTexts()).filter(Boolean).join(' ; '));
console.log('labels:', (await page.locator('label').allInnerTexts()).join(' | '));
await browser.close();
