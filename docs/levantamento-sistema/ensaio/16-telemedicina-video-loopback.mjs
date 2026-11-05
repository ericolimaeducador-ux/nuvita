// Tenta uma chamada de vídeo REAL entre dois navegadores na mesma máquina, com câmera/microfone falsos do
// Chromium (--use-fake-device-for-media-stream). Mostra se o WebRTC conecta no ambiente local. Dados fictícios.
import { observar, foto, lerContas, totp, BASE, salvarResultado } from './lib.mjs';
import { chromium } from 'playwright';
const c = lerContas(process.env.CONTAS); const API = 'http://localhost:3000';
const j = async (m, p, t, b) => { const r = await fetch(API + p, { method: m, headers: { 'content-type': 'application/json', ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); let x = null; try { x = await r.json(); } catch {} return { status: r.status, json: x }; };
const l = await j('POST', '/auth/login', null, { email: c.psicologo.email, password: c.psicologo.senha, totpCode: totp(c.psicologo.segredo2fa) });
const t = l.json.accessToken;
const al = (await j('GET', '/agendamentos', t)).json; const ag = (al.items ?? al)[0];
const sala = (await j('POST', '/telemedicina/salas', t, { agendamentoId: ag.id, pacienteId: ag.pacienteId, modalidade: 'psicologia' })).json;

const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
const mk = async () => { const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 }, permissions: ['camera', 'microphone'] }); await ctx.route('**/*', (r) => { const u = new URL(r.request().url()); return ['127.0.0.1', 'localhost'].includes(u.hostname) || u.protocol === 'data:' || u.protocol === 'blob:' ? r.fallback() : r.abort(); }); return ctx; };
const ctxP = await mk(); const ctxM = await mk();
const pagePac = await ctxP.newPage(); const obsP = observar(pagePac);
const pageMed = await ctxM.newPage(); const obsM = observar(pageMed);
// profissional: abre a sala pelo token do médico (mesma página pública /tele/:token)
await pageMed.goto(`${BASE}/tele/${sala.tokenMedico}`); await pageMed.waitForTimeout(1500);
await pageMed.getByRole('button', { name: /entrar no atendimento/i }).click();
await pagePac.goto(`${BASE}/tele/${sala.tokenPaciente}`); await pagePac.waitForTimeout(1500);
await pagePac.getByRole('button', { name: /entrar no atendimento/i }).click();
await pageMed.waitForTimeout(9000);
const estado = async (p) => p.evaluate(() => [...document.querySelectorAll('video')].map((v) => ({ temStream: !!v.srcObject, trilhas: v.srcObject ? v.srcObject.getTracks().length : 0, readyState: v.readyState, largura: v.videoWidth, tocando: !v.paused })));
const R = { medico: await estado(pageMed), paciente: await estado(pagePac), textoMedico: (await pageMed.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 220), textoPaciente: (await pagePac.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 220), errosMedico: obsM.erros.map((e) => `${e.status} ${e.url.replace(sala.tokenMedico, ':tok')}`), errosPaciente: obsP.erros.map((e) => `${e.status} ${e.url.replace(sala.tokenPaciente, ':tok')}`) };
await foto(pageMed, 'telemedicina/06-chamada-lado-profissional.png'); await foto(pagePac, 'telemedicina/07-chamada-lado-paciente.png');
salvarResultado('16-telemedicina-video-loopback', R); console.log(JSON.stringify(R, null, 1));
await j('PATCH', `/telemedicina/salas/${sala.id}/encerrar`, t);
await browser.close();
