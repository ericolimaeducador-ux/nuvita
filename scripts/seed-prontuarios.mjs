// Popula prontuários SOAP (um assinado + rascunhos) para a clínica demo.
// Cria/usa um médico com 2FA, loga e registra os prontuários.
// Uso: node scripts/seed-prontuarios.mjs
import speakeasy from 'speakeasy';

const API = 'http://localhost:3000';
const CLINICA_ID = process.env.CLINICA_ID || '6a3301636632591912f45670';
const MEDICO_EMAIL = process.env.MEDICO_EMAIL || 'dr.ricardo@demo.com';
const MEDICO_PASS = process.env.MEDICO_PASS || 'SenhaForte123';

let token = null;
async function req(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  if (res.status >= 400) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

function pickItems(data) {
  if (Array.isArray(data)) return data;
  return data.items ?? data.data ?? [];
}

async function main() {
  // 1) Registra o médico (capturando o segredo 2FA)
  let base32;
  try {
    const reg = await req('POST', '/auth/register', {
      nome: 'Dr. Ricardo Nunes',
      email: MEDICO_EMAIL,
      password: MEDICO_PASS,
      papel: 'MEDICO',
      clinicaId: CLINICA_ID,
    });
    base32 = reg.twoFactorSetup?.base32;
    console.log('✓ médico criado:', MEDICO_EMAIL);
  } catch (e) {
    console.error('Não foi possível registrar o médico (talvez já exista de uma execução anterior).');
    console.error(e.message);
    console.error('Dica: rode com outro e-mail: MEDICO_EMAIL=dr.outro@demo.com node scripts/seed-prontuarios.mjs');
    process.exit(1);
  }
  if (!base32) throw new Error('register não retornou o segredo 2FA.');

  // 2) Login com TOTP
  const totpCode = speakeasy.totp({ secret: base32, encoding: 'base32' });
  const login = await req('POST', '/auth/login', { email: MEDICO_EMAIL, password: MEDICO_PASS, totpCode });
  token = login.accessToken;
  console.log('✓ login médico OK');

  // 3) Pacientes
  const pacientes = pickItems(await req('GET', '/pacientes?limit=50'));
  const byName = (frag) => pacientes.find((p) => p.nome.toLowerCase().includes(frag));
  const mariana = byName('mariana') ?? pacientes[0];
  const joao = byName('joão') ?? byName('joao') ?? pacientes[1];
  const ana = byName('ana') ?? pacientes[2];

  const hoje = new Date().toISOString();

  // 4) Prontuário 1 — completo e ASSINADO (paciente com atendimento realizado)
  const p1 = await req('POST', '/prontuarios', {
    clinicaId: CLINICA_ID,
    pacienteId: mariana.id,
    dataAtendimento: hoje,
    tipo: 'consulta',
    subjetivo: {
      queixaPrincipal: 'Cefaleia há 3 dias, de moderada intensidade.',
      hda: 'Dor em região frontal, pulsátil, pior à tarde, melhora parcial com analgésico comum. Nega febre ou trauma.',
    },
    objetivo: {
      exameFisico: 'BEG, corada, hidratada, afebril. ACV: BNF 2T sem sopros. AR: MV+ sem RA. Neuro sem déficits focais.',
      sinaisVitais: { pressaoArterial: '120/80', frequenciaCardiaca: 76, temperatura: 36.5, saturacaoO2: 98 },
    },
    avaliacao: {
      hipotesesDiagnosticas: ['Cefaleia tensional'],
      cid10: ['G44.2'],
    },
    plano: {
      conduta: 'Orientado repouso e hidratação. Retorno se piora ou sinais de alarme.',
      prescricao: 'Dipirona 1g VO até 6/6h se dor.',
      examesSolicitados: [],
    },
  });
  const p1id = p1.id ?? p1.prontuario?.id;
  await req('POST', `/prontuarios/${p1id}/assinar`);
  console.log('✓ prontuário ASSINADO para', mariana.nome);

  // 5) Prontuário 2 — RASCUNHO
  const p2 = await req('POST', '/prontuarios', {
    clinicaId: CLINICA_ID,
    pacienteId: joao.id,
    dataAtendimento: hoje,
    tipo: 'retorno',
    subjetivo: { queixaPrincipal: 'Retorno para avaliação de exames laboratoriais.', hda: 'Assintomático no momento.' },
    objetivo: { exameFisico: 'Sem alterações dignas de nota.', sinaisVitais: { pressaoArterial: '130/85', frequenciaCardiaca: 80 } },
    avaliacao: { hipotesesDiagnosticas: ['Dislipidemia em acompanhamento'], cid10: ['E78.5'] },
    plano: { conduta: 'Manter dieta e atividade física. Reavaliar em 3 meses.', examesSolicitados: ['Perfil lipídico', 'Glicemia de jejum'] },
  });
  console.log('✓ prontuário RASCUNHO para', joao.nome);

  // 6) Prontuário 3 — RASCUNHO (urgência)
  const p3 = await req('POST', '/prontuarios', {
    clinicaId: CLINICA_ID,
    pacienteId: ana.id,
    dataAtendimento: hoje,
    tipo: 'urgencia',
    subjetivo: { queixaPrincipal: 'Dor abdominal em fossa ilíaca direita.', hda: 'Início há 12h, em cólica, associada a náuseas.' },
    objetivo: { exameFisico: 'Abdome doloroso à palpação profunda em FID, Blumberg duvidoso.', sinaisVitais: { temperatura: 37.8, frequenciaCardiaca: 92 } },
    avaliacao: { hipotesesDiagnosticas: ['Abdome agudo a esclarecer', 'Apendicite aguda?'], cid10: ['R10.3'] },
    plano: { conduta: 'Solicitar exames e avaliação cirúrgica.', examesSolicitados: ['Hemograma', 'USG de abdome'] },
  });
  console.log('✓ prontuário RASCUNHO para', ana.nome);

  console.log(JSON.stringify({
    medicoLogin: { email: MEDICO_EMAIL, password: MEDICO_PASS, base32 },
    prontuariosCriados: [p1id, p2.id ?? p2.prontuario?.id, p3.id ?? p3.prontuario?.id],
  }, null, 2));
}

main().catch((e) => { console.error('❌ Falha:', e.message); process.exit(1); });
