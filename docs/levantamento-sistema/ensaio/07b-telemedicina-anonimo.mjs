import { abrir, observar, foto, lerContas, totp, BASE, salvarResultado } from './lib.mjs';
const c = lerContas(process.env.CONTAS); const API = 'http://localhost:3000';
const j = async (m, p, t, b) => { const r = await fetch(API + p, { method: m, headers: { 'content-type': 'application/json', ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); let x = null; try { x = await r.json(); } catch {} return { status: r.status, json: x }; };
const l = await j('POST', '/auth/login', null, { email: c.psicologo.email, password: c.psicologo.senha, totpCode: totp(c.psicologo.segredo2fa) });
const t = l.json.accessToken;
const al = (await j('GET', '/agendamentos', t)).json; const ag = (al.items ?? al)[0];
const sala = (await j('POST', '/telemedicina/salas', t, { agendamentoId: ag.id, pacienteId: ag.pacienteId, modalidade: 'psicologia' })).json;
const tok = sala.tokenPaciente;
// contexto NOVO = janela anônima (sem cookie/localStorage); câmera/microfone falsos do Chromium
const { chromium } = await import('playwright');
const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['camera', 'microphone'] });
const page = await ctx.newPage(); const obs = observar(page);
await page.goto(`${BASE}/tele/${tok}`); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(2500);
await foto(page, 'telemedicina/01-sala-paciente-janela-anonima.png');
const R = { url: page.url().replace(tok, ':token'), storageVazio: await page.evaluate(() => localStorage.length === 0), titulos: (await page.locator('h1,h2').allInnerTexts()), botoes: (await page.getByRole('button').allInnerTexts()), texto: (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 300), erros: obs.erros.map((e) => `${e.status} ${e.url.replace(tok, ':token')}`) };
salvarResultado('07b-telemedicina-anonimo', R); console.log(JSON.stringify(R, null, 1));
await browser.close();
