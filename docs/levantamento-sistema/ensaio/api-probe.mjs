// Sonda os GETs da API LOCAL com a sessão de um perfil: status + forma da resposta (sem despejar dados).
// Verifica o gate de API (independente do menu/rota do web). Uso: CONTAS=<json> node api-probe.mjs <perfil>
import { lerContas, totp, salvarResultado } from './lib.mjs';

const API = 'http://localhost:3000';
const perfil = process.argv[2];
const contas = lerContas(process.env.CONTAS);
const conta = contas[perfil];
const ids = contas.ids;

async function chamar(metodo, caminho, token, corpo) {
  const r = await fetch(API + caminho, { method: metodo, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
  let j; try { j = await r.json(); } catch { j = null; }
  return { status: r.status, json: j };
}

const login = await chamar('POST', '/auth/login', null, { email: conta.email, password: conta.senha, ...(conta.segredo2fa ? { totpCode: totp(conta.segredo2fa) } : {}) });
if (!login.json?.accessToken) { console.log('login falhou', login.status, JSON.stringify(login.json).slice(0, 200)); process.exit(1); }
const t = login.json.accessToken;

const forma = (j) => {
  if (j == null) return '';
  if (Array.isArray(j)) return `array[${j.length}]`;
  if (Array.isArray(j.items)) return `items[${j.items.length}] total=${j.total ?? '?'}`;
  return 'obj{' + Object.keys(j).slice(0, 8).join(',') + '}';
};
const ALVOS = [
  '/agendamentos', '/agendamentos/bloqueios', '/analytics/pacientes', '/analytics/agendamentos', '/analytics/financeiro',
  '/analytics/notificacoes', '/analytics/pacientes-por-representante', '/analytics/cobrancas-psicologia', '/analytics/perda-seguimento',
  '/analytics/horarios-vagos', '/clinicas/minha', '/documentos', '/financeiro/lancamentos', '/financeiro/dashboard',
  '/financeiro/psicologia/painel', '/inscricoes-teste', '/notificacoes/dashboard', `/observacoes-paciente?pacienteId=${ids.pacienteId}`,
  '/pacientes', `/pacientes/${ids.pacienteId}`, `/pacientes/${ids.pacienteId}/export`, '/pacientes/representantes', '/prontuarios',
  `/prontuarios/${ids.prontuarioId}`, '/telemedicina/salas', `/testes-psicologicos?pacienteId=${ids.pacienteId}`, '/tickets',
  '/super-admin/clinicas', '/super-admin/usuarios',
];
const saida = [];
for (const a of ALVOS) {
  const r = await chamar('GET', a, t);
  saida.push({ alvo: a.replace(ids.pacienteId, ':pac').replace(ids.prontuarioId, ':pront'), status: r.status, forma: r.status < 300 ? forma(r.json) : (r.json?.message ?? '').toString().slice(0, 80) });
}
salvarResultado(`api-${perfil}`, saida);
for (const s of saida) console.log(String(s.status).padEnd(4), s.alvo.padEnd(48), s.forma);
