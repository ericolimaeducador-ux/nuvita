// C.3: chamada de IA SEM chave real -> o que a API devolve e o que fica gravado.
import { lerContas, totp, salvarResultado } from './lib.mjs';
const c = lerContas(process.env.CONTAS); const API = 'http://localhost:3000';
const j = async (m, p, t, b) => { const r = await fetch(API + p, { method: m, headers: { 'content-type': 'application/json', ...(t ? { authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined }); let x = null; try { x = await r.json(); } catch {} return { status: r.status, json: x }; };
const l = await j('POST', '/auth/login', null, { email: c.psicologo.email, password: c.psicologo.senha, totpCode: totp(c.psicologo.segredo2fa) });
const t = l.json.accessToken;
const a = await j('POST', '/ia-clinica/sugerir-abordagem', t, { linhaTerapeutica: 'TCC', motivoAtendimento: 'texto fictício de teste' });
const p = await j('POST', '/ia-clinica/gerar-prescricao', t, { linhaTerapeutica: 'TCC', contextoClinico: 'texto fictício de teste' });
const d = await j('POST', '/ia-clinica/registros/000000000000000000000000/decisao', t, { decisao: 'ACEITA' });
const R = { sugerirAbordagem: { status: a.status, mensagem: a.json?.message }, gerarPrescricao: { status: p.status, mensagem: p.json?.message }, decisaoRegistroInexistente: { status: d.status, mensagem: d.json?.message } };
salvarResultado('09-ia-sem-chave', R); console.log(JSON.stringify(R, null, 1));
