// B.1: segurança do token da sala /tele/:token (API e web LOCAIS, dados fictícios).
import { abrir, observar, foto, lerContas, totp, BASE, salvarResultado } from './lib.mjs';
import { readFileSync } from 'fs';
const c = lerContas(process.env.CONTAS);
const API = 'http://localhost:3000';
const j = async (m, p, t, b) => { const r = await fetch(API + p, { method: m, headers: { 'content-type': 'application/json', ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); let x = null; try { x = await r.json(); } catch {} return { status: r.status, json: x }; };
const l = await j('POST', '/auth/login', null, { email: c.psicologo.email, password: c.psicologo.senha, totpCode: totp(c.psicologo.segredo2fa) });
const t = l.json.accessToken;
const ags = (await j('GET', '/agendamentos', t)).json; const ag = (ags.items ?? ags)[0];
const sala = await j('POST', '/telemedicina/salas', t, { agendamentoId: ag.id, pacienteId: ag.pacienteId, modalidade: 'psicologia' });
const s = sala.json;
const R = { criarSala: sala.status, chavesDaSala: Object.keys(s ?? {}), tokenPacienteTam: s?.tokenPaciente?.length, ttlHoras: (new Date(s.expiresAt) - new Date()) / 3.6e6 };
const tok = s.tokenPaciente, tokMed = s.tokenMedico;
// 1) acesso SEM login (curl-equivalente)
R.semLogin_GET = (await j('GET', `/telemedicina/acesso/${tok}`)).status;
const ent1 = await j('POST', `/telemedicina/acesso/${tok}/entrar`);
const ent2 = await j('POST', `/telemedicina/acesso/${tok}/entrar`);
R.entrar_1a_vez = ent1.status; R.entrar_2a_vez_reutilizavel = ent2.status;
R.entrarChaves = Object.keys(ent1.json ?? {});
// 2) token inventado
R.tokenAleatorio = (await j('GET', `/telemedicina/acesso/00000000-0000-4000-8000-000000000000`)).status;
// 3) rate limit em tentativa de enumeração (limite declarado: 20/min por IP)
const codigos = [];
for (let i = 0; i < 30; i++) codigos.push((await j('GET', `/telemedicina/acesso/${crypto.randomUUID()}`)).status);
R.enumeracao_30_tentativas = codigos.reduce((a, x) => (a[x] = (a[x] || 0) + 1, a), {});
// 4) janela anônima (contexto novo, sem storage) abre a sala?
const { browser, ctx } = await abrir();
const page = await ctx.newPage(); const obs = observar(page);
await page.goto(`${BASE}/tele/${tok}`); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500);
await foto(page, 'telemedicina/01-sala-paciente-janela-anonima.png');
R.anonimo_url = page.url().replace(BASE, '').replace(tok, ':token');
R.anonimo_texto = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 300);
R.anonimo_erros = obs.erros.map((e) => `${e.status} ${e.url.replace(tok, ':token').replace(tokMed, ':tokenMed')}`);
await browser.close();
// 5) encerrar -> token deixa de valer?
const enc = await j('PATCH', `/telemedicina/salas/${s.id}/encerrar`, t);
R.encerrar = enc.status;
R.depoisDeEncerrar_entrar = (await j('POST', `/telemedicina/acesso/${tok}/entrar`)).status;
R.depoisDeEncerrar_GET = (await j('GET', `/telemedicina/acesso/${tok}`)).status;
// 6) onde o token aparece persistido/logado?
const log = readFileSync(process.env.API_LOG, 'utf-8');
R.token_no_log_da_api = log.includes(tok) || log.includes(tokMed);
R.sala_listada_expoe_tokens = (() => null)();
const lista = await j('GET', '/telemedicina/salas', t);
const it = (lista.json.items ?? lista.json)[0];
R.lista_de_salas_expoe_tokens = !!(it && (it.tokenPaciente || it.tokenMedico));
salvarResultado('07-telemedicina-token', R);
console.log(JSON.stringify(R, null, 1));
globalThis.__tok = tok;
