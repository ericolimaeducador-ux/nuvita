// Valida a paridade do ENFERMEIRO: registra, loga com 2FA, cria e ASSINA prontuário.
import speakeasy from 'speakeasy';
const API = 'http://localhost:3000';
const CLINICA_ID = process.env.CLINICA_ID || '6a3301636632591912f45670';
const email = process.env.ENF_EMAIL || 'enf.paula@demo.com';
const password = 'SenhaForte123';
let token = null;
async function req(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await res.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
  return { status: res.status, json: j };
}
const reg = await req('POST', '/auth/register', { nome: 'Enf. Paula Lima', email, password, papel: 'ENFERMEIRO', clinicaId: CLINICA_ID });
if (reg.status >= 400) { console.error('register falhou:', reg.status, JSON.stringify(reg.json)); process.exit(1); }
const base32 = reg.json.twoFactorSetup?.base32;
console.log('register:', reg.status, '| 2FA exigido:', !!base32);
const code = speakeasy.totp({ secret: base32, encoding: 'base32' });
const login = await req('POST', '/auth/login', { email, password, totpCode: code });
console.log('login:', login.status);
token = login.json.accessToken;
const pacientes = (await req('GET', '/pacientes?limit=1')).json;
const pid = (pacientes.items ?? pacientes.data ?? pacientes)[0].id;
const pront = await req('POST', '/prontuarios', {
  clinicaId: CLINICA_ID, pacienteId: pid, dataAtendimento: new Date().toISOString(), tipo: 'consulta',
  subjetivo: { queixaPrincipal: 'Teste paridade enfermeiro' },
  objetivo: { sinaisVitais: { pressaoArterial: '120/80', frequenciaCardiaca: 72 } },
  avaliacao: { hipotesesDiagnosticas: ['Avaliação de enfermagem'] },
  plano: { conduta: 'Acompanhamento' },
});
console.log('criar prontuário:', pront.status);
const pid2 = pront.json.id ?? pront.json.prontuario?.id;
const assinar = await req('POST', `/prontuarios/${pid2}/assinar`);
console.log('assinar prontuário:', assinar.status);
console.log('\nRESULTADO:', (login.status === 201 && pront.status === 201 && assinar.status === 201) ? '✅ PARIDADE OK (cria e assina)' : '❌ algo falhou');
console.log(JSON.stringify({ login: { email, password, base32 } }, null, 2));
