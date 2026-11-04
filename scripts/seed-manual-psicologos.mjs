// Seed de DEMONSTRAÇÃO para o ensaio do manual dos psicólogos. Só roda contra Mongo LOCAL.
// Cria (idempotente): 1 clínica, 1 psicólogo (com 2FA), 2 pacientes fictícios, 1 agendamento,
// 1 evolução de psicoterapia (rascunho) e 1 teste psicológico aplicado.
// Uso (API local em http://localhost:3000, mesmo MONGODB_URI da API):
//   MONGODB_URI=mongodb://127.0.0.1:27017/nuvita-psi node scripts/seed-manual-psicologos.mjs
// Ao final o psicólogo fica em "primeiro acesso" (troca de senha + aceite do Termo de Teste pendentes).
import { MongoClient, ObjectId } from 'mongodb';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const bcrypt = require('bcrypt');
const speakeasy = require('speakeasy');

// ---------------------------------------------------------------------------
// TRAVA DE HOST: bloqueante, sem flag nem variável de override. Não editar para "liberar".
// ---------------------------------------------------------------------------
function exigirMongoLocal() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('ABORTADO: defina MONGODB_URI apontando para o Mongo LOCAL (127.0.0.1 ou localhost).');
    process.exit(1);
  }
  let hosts;
  try {
    // Extrai os hosts (pode haver vários, separados por vírgula) sem depender do parser de URL.
    const m = uri.match(/^mongodb:\/\/(?:[^@/]*@)?([^/?]+)/);
    if (!m) throw new Error('esquema não suportado (só mongodb://; mongodb+srv:// é rejeitado)');
    hosts = m[1].split(',').map((h) => h.replace(/:\d+$/, '').toLowerCase());
  } catch (e) {
    console.error(`ABORTADO: MONGODB_URI inválida ou não local (${e.message}).`);
    process.exit(1);
  }
  if (!hosts.every((h) => h === '127.0.0.1' || h === 'localhost')) {
    console.error(`ABORTADO: o host do MONGODB_URI não é local (${hosts.join(', ')}). Este seed só roda em 127.0.0.1 ou localhost.`);
    process.exit(1);
  }
  return uri;
}

const MONGODB_URI = exigirMongoLocal();
const API = 'http://localhost:3000';

const CLINICA_NOME = 'Clínica Demonstração (Manual)';
const PSI_EMAIL = 'psicologa.demo@manual.nuvita.test';
const PSI_SENHA = 'DemoManual#2026';
const TERMO_TESTE = 'teste-beta-v1-2026-10'; // TERMO_DE_TESTE_VERSAO_ATUAL (packages/shared/src/termos)

// CPF válido pelo algoritmo dos dígitos verificadores, a partir de uma base fixa e fictícia.
function cpfDe(base9) {
  const n = base9.split('').map(Number);
  const dv = (d) => {
    const soma = d.reduce((s, x, i) => s + x * (d.length + 1 - i), 0);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = dv(n);
  const d2 = dv([...n, d1]);
  const t = [...n, d1, d2].join('');
  return `${t.slice(0, 3)}.${t.slice(3, 6)}.${t.slice(6, 9)}-${t.slice(9)}`;
}

let token = null;
async function req(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  if (res.status >= 400) throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  return json;
}
const itens = (r) => (Array.isArray(r) ? r : r?.items ?? []);

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db();
  console.log(`✓ Mongo local conectado (db: ${db.databaseName})`);
  const agora = new Date();

  // 1) Clínica
  let clinica = await db.collection('clinicas').findOne({ nome: CLINICA_NOME });
  if (!clinica) {
    clinica = {
      _id: new ObjectId(),
      nome: CLINICA_NOME,
      cnpj: '11222333000181',
      tipoDocumento: 'CNPJ',
      plano: 'profissional',
      configuracoes: { fusoHorario: 'America/Sao_Paulo', duracaoConsultaPadrao: 50 },
      ativo: true,
      faseTeste: true,
      criadoEm: agora,
    };
    await db.collection('clinicas').insertOne(clinica);
    console.log('✓ clínica criada');
  } else {
    console.log('= clínica já existe');
  }
  const clinicaId = clinica._id.toString();

  // 2) Psicólogo (2FA obrigatório para este papel)
  let psi = await db.collection('users').findOne({ email: PSI_EMAIL });
  let segredo2fa;
  if (!psi) {
    segredo2fa = speakeasy.generateSecret({ length: 20 }).base32;
    psi = {
      _id: new ObjectId(),
      nome: 'Psicóloga Demonstração',
      email: PSI_EMAIL,
      passwordHash: await bcrypt.hash(PSI_SENHA, 12),
      papel: 'PSICOLOGO',
      clinicaId,
      crp: 'CRP 00/00000',
      registroProfissional: 'CRP 00/00000',
      '2faSecret': segredo2fa,
      ativo: true,
      faseTeste: true,
      criadoEm: agora,
    };
    await db.collection('users').insertOne(psi);
    console.log('✓ psicólogo criado');
  } else {
    segredo2fa = psi['2faSecret'];
    console.log('= psicólogo já existe');
  }
  const psiId = psi._id.toString();

  // Libera os gates de primeiro acesso só para semear pela API; são restaurados ao final.
  await db.collection('users').updateOne(
    { _id: psi._id },
    { $set: { passwordHash: await bcrypt.hash(PSI_SENHA, 12), deveTrocarSenha: false, termosAceitos: { versao: TERMO_TESTE, dataAceite: agora } } },
  );

  // 3) Login pela API (com TOTP)
  const login = await req('POST', '/auth/login', {
    email: PSI_EMAIL,
    password: PSI_SENHA,
    totpCode: speakeasy.totp({ secret: segredo2fa, encoding: 'base32' }),
  });
  token = login.accessToken;
  console.log('✓ login do psicólogo pela API local');

  // 4) Pacientes fictícios
  const modelos = [
    { nome: 'Ana Exemplo Demonstração', cpf: cpfDe('390533447'), nasc: '1990-04-12', sexo: 'FEMININO', tel: '(11) 90000-0001', linha: 'TCC' },
    { nome: 'Bruno Exemplo Demonstração', cpf: cpfDe('529982247'), nasc: '1985-09-30', sexo: 'MASCULINO', tel: '(11) 90000-0002', linha: 'PSICANALISE' },
  ];
  const pacientes = [];
  for (const m of modelos) {
    const achados = itens(await req('GET', `/pacientes?nome=${encodeURIComponent(m.nome)}`));
    let p = achados.find((x) => x.nome === m.nome);
    if (!p) {
      p = await req('POST', '/pacientes', {
        clinicaId,
        nome: m.nome,
        cpf: m.cpf,
        dataNascimento: m.nasc,
        sexo: m.sexo,
        projeto: 'PSI',
        linhaTerapeutica: m.linha,
        telefone: m.tel,
        email: `${m.nome.split(' ')[0].toLowerCase()}@manual.nuvita.test`,
        consentimentoLGPD: { aceito: true, dataAceite: agora.toISOString(), versao: '1.0' },
      });
      console.log(`✓ paciente criado: ${m.nome}`);
    } else {
      console.log(`= paciente já existe: ${m.nome}`);
    }
    pacientes.push(p);
  }
  const [p1, p2] = pacientes;

  // 5) Agendamento (amanhã 14h, paciente 1)
  const ags = itens(await req('GET', `/agendamentos?pacienteId=${p1.id}`));
  let ag = ags[0];
  if (!ag) {
    const ini = new Date();
    ini.setDate(ini.getDate() + 1);
    ini.setHours(14, 0, 0, 0);
    const fim = new Date(ini.getTime() + 50 * 60000);
    ag = await req('POST', '/agendamentos', {
      clinicaId,
      pacienteId: p1.id,
      medicoId: psiId,
      modalidade: 'psicologia',
      dataHoraInicio: ini.toISOString(),
      dataHoraFim: fim.toISOString(),
      tipo: 'sessao_psicoterapia',
      observacoes: 'Sessão de exemplo para o manual.',
    });
    console.log('✓ agendamento criado');
  } else {
    console.log('= agendamento já existe');
  }

  // 6) Evolução de psicoterapia (rascunho) do paciente 2. O prontuário é ancorado num agendamento do
  // MESMO paciente (obrigatório desde o #52; a data da evolução é a do agendamento), então o seed cria
  // um agendamento passado (ontem 10h) para o paciente 2.
  const pronts = itens(await req('GET', `/prontuarios?pacienteId=${p2.id}`));
  if (pronts.length === 0) {
    const agsP2 = itens(await req('GET', `/agendamentos?pacienteId=${p2.id}`));
    let ag2 = agsP2[0];
    if (!ag2) {
      const ini2 = new Date();
      ini2.setDate(ini2.getDate() - 1);
      ini2.setHours(10, 0, 0, 0);
      ag2 = await req('POST', '/agendamentos', {
        clinicaId,
        pacienteId: p2.id,
        medicoId: psiId,
        modalidade: 'psicologia',
        dataHoraInicio: ini2.toISOString(),
        dataHoraFim: new Date(ini2.getTime() + 50 * 60000).toISOString(),
        tipo: 'sessao_psicoterapia',
        observacoes: 'Sessão de exemplo (já realizada) para o manual.',
      });
      console.log('✓ agendamento passado do paciente 2 criado');
    }
    await req('POST', '/prontuarios', {
      clinicaId,
      pacienteId: p2.id,
      agendamentoId: ag2.id,
      dataAtendimento: agora.toISOString(),
      tipo: 'psicoterapia',
      // Desde o #62 o registro grava qual formulário foi usado; o CRP não vai no corpo (o servidor carimba o do perfil, #61).
      formulario: 'completo',
      registroPsicologico: {
        motivoAtendimento: 'Paciente fictício, criado para o manual. Relata cansaço e dificuldade para dormir.',
        objetivosTrabalho: 'Exemplo: organizar a rotina de sono.',
        evolucao: 'Exemplo de evolução: primeira sessão de acolhimento, vínculo inicial estabelecido.',
        anotacoesLivres: 'Texto de exemplo. Nenhum dado real.',
      },
    });
    console.log('✓ evolução (rascunho) criada');
  } else {
    console.log('= evolução já existe');
  }

  // 7) Teste psicológico aplicado ao paciente 1
  const testes = itens(await req('GET', `/testes-psicologicos?pacienteId=${p1.id}`));
  if (testes.length === 0) {
    await req('POST', '/testes-psicologicos', {
      clinicaId,
      pacienteId: p1.id,
      nomeTeste: 'BDI-II (exemplo)',
      dataAplicacao: agora.toISOString(),
      resultado: 'Exemplo: escore fictício, sem valor clínico.',
    });
    console.log('✓ teste psicológico criado');
  } else {
    console.log('= teste já existe');
  }

  // 8) Devolve o psicólogo ao estado de PRIMEIRO ACESSO (troca de senha + aceite do termo pendentes)
  await db.collection('users').updateOne({ _id: psi._id }, { $set: { deveTrocarSenha: true }, $unset: { termosAceitos: '' } });
  await client.close();

  console.log('\n✅ Seed concluído (dados 100% fictícios, base local).');
  console.log('  Login do ensaio  :', PSI_EMAIL, '/', PSI_SENHA);
  console.log('  Segredo 2FA (base32):', segredo2fa);
  console.log('  otpauth          :', `otpauth://totp/Nuvita%20Psi:${encodeURIComponent(PSI_EMAIL)}?secret=${segredo2fa}&issuer=Nuvita%20Psi`);
  console.log('  Obs.: no 1º login a plataforma exige trocar a senha e aceitar o Termo de Teste. Rodar o seed de novo repõe a senha acima.');
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
