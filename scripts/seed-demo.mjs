// Popula a clínica demo com 1 médico, pacientes e agendamentos variados.
// Uso: node scripts/seed-demo.mjs
const API = 'http://localhost:3000';
const CLINICA_ID = process.env.CLINICA_ID || '6a3301636632591912f45670';

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
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  if (res.status >= 400) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

// ----- CPF válido (com dígitos verificadores) -----
function gerarCpf() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 9));
  const dv = (base) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += base[i] * (base.length + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = dv(n);
  const d2 = dv([...n, d1]);
  const d = [...n, d1, d2].join('');
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

const iso = (dia, hora, min = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + dia);
  d.setHours(hora, min, 0, 0);
  return d.toISOString();
};
const maisMin = (isoStr, min) =>
  new Date(new Date(isoStr).getTime() + min * 60000).toISOString();

async function main() {
  // 1) Login como secretaria
  const login = await req('POST', '/auth/login', {
    email: 'recepcao@demo.com',
    password: 'SenhaForte123',
  });
  token = login.accessToken;
  console.log('✓ login secretaria');

  // 2) Médico (via register; usamos só o id como medicoId)
  let medicoId;
  try {
    const med = await req('POST', '/auth/register', {
      nome: 'Dra. Helena Martins',
      email: 'dra.helena@demo.com',
      password: 'SenhaForte123',
      papel: 'MEDICO',
      clinicaId: CLINICA_ID,
    });
    medicoId = med.user?.id ?? med.id;
    console.log('✓ médico criado:', medicoId);
  } catch (e) {
    // se já existe, gera um ObjectId qualquer (o serviço só checa conflito de horário)
    medicoId = '6a3301636632591912f456aa';
    console.log('• médico já existia, usando id fixo:', e.message.slice(0, 60));
  }

  // 3) Pacientes
  const pessoas = [
    { nome: 'Mariana Oliveira Costa', sexo: 'FEMININO', nasc: '1990-04-12', tel: '(11) 98888-1010' },
    { nome: 'João Pedro Almeida', sexo: 'MASCULINO', nasc: '1985-09-30', tel: '(11) 97777-2020' },
    { nome: 'Ana Beatriz Souza', sexo: 'FEMININO', nasc: '1978-01-25', tel: '(11) 96666-3030' },
    { nome: 'Carlos Eduardo Lima', sexo: 'MASCULINO', nasc: '2001-11-05', tel: '(11) 95555-4040' },
    { nome: 'Fernanda Ribeiro', sexo: 'FEMININO', nasc: '1995-07-18', tel: '(11) 94444-5050' },
    { nome: 'Roberto Carvalho', sexo: 'MASCULINO', nasc: '1969-03-22', tel: '(11) 93333-6060' },
  ];
  const pacientes = [];
  for (const p of pessoas) {
    const novo = await req('POST', '/pacientes', {
      clinicaId: CLINICA_ID,
      nome: p.nome,
      cpf: gerarCpf(),
      dataNascimento: p.nasc,
      sexo: p.sexo,
      telefone: p.tel,
      email: p.nome.toLowerCase().split(' ')[0] + '@email.com',
      consentimentoLGPD: { aceito: true, dataAceite: new Date().toISOString(), versao: '1.0' },
    });
    pacientes.push(novo.id ?? novo.paciente?.id);
    console.log('  ✓ paciente:', p.nome);
  }

  // 4) Agendamentos (sem conflito de horário para o mesmo médico)
  const tipos = ['CONSULTA', 'RETORNO', 'EXAME', 'PROCEDIMENTO', 'TELEMEDICINA'];
  const plano = [
    { dia: 0, hora: 9, status: ['EM_ATENDIMENTO', 'REALIZADO'] }, // realizado
    { dia: 0, hora: 10, status: ['CONFIRMADO'] },
    { dia: 0, hora: 11, status: ['EM_ATENDIMENTO'] },
    { dia: 0, hora: 14, status: [] }, // agendado
    { dia: 0, hora: 15, status: ['CONFIRMADO'] },
    { dia: 1, hora: 9, status: [] },
    { dia: 1, hora: 10, status: ['FALTOU'] },
    { dia: 2, hora: 16, status: [] },
  ];

  let i = 0;
  for (const ag of plano) {
    const inicio = iso(ag.dia, ag.hora);
    const fim = maisMin(inicio, 30);
    const criado = await req('POST', '/agendamentos', {
      clinicaId: CLINICA_ID,
      pacienteId: pacientes[i % pacientes.length],
      medicoId,
      inicio,
      fim,
      tipo: tipos[i % tipos.length],
      observacoes: 'Agendamento de demonstração.',
    });
    const agId = criado.id ?? criado.agendamento?.id;
    for (const s of ag.status) {
      await req('PATCH', `/agendamentos/${agId}/status`, { status: s });
    }
    console.log(
      `  ✓ agendamento ${inicio.slice(0, 16).replace('T', ' ')} ${tipos[i % tipos.length]}` +
        (ag.status.length ? ` -> ${ag.status[ag.status.length - 1]}` : ' -> AGENDADO'),
    );
    i++;
  }

  console.log('\n✅ Seed concluído:', pacientes.length, 'pacientes,', plano.length, 'agendamentos.');
}

main().catch((e) => {
  console.error('❌ Falha no seed:', e.message);
  process.exit(1);
});
