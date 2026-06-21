/**
 * Seed completo do fluxo VaPro/Nuvita
 * Cria: clínica (bootstrap) → usuários → pacientes → agendamentos
 *       → avaliações IU → follow-ups → laudos → processos → entregas
 *
 * Uso:
 *   1) Tenha o servidor rodando: npm run dev (na raiz do monorepo)
 *   2) node scripts/seed-vapro.mjs
 *
 * Se a clínica ainda não existir, o script imprime o comando bootstrap e para.
 * Para re-rodar em banco limpo, passe: RESET=1 node scripts/seed-vapro.mjs
 */

import { createHmac } from 'crypto';
import { MongoClient } from 'mongodb';

const API = process.env.API_URL || 'http://localhost:3000';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nuvita';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@nuvita.demo';
const ADMIN_PASS = process.env.ADMIN_PASS || 'SenhaForte123';
const DEV_TOTP_SECRET = process.env.TOTP_SECRET || 'JBSWY3DPEHPK3PXP';
// Papeis que exigem 2FA (deve refletir PAPEIS_COM_2FA_OBRIGATORIO no shared)
const PAPEIS_2FA = ['SUPER_ADMIN', 'ADMIN', 'MEDICO', 'ENFERMEIRO', 'ADVOGADO'];
const BOOTSTRAP_SECRET = process.env.BOOTSTRAP_SECRET;
if (!BOOTSTRAP_SECRET) {
  console.error('✗ Defina BOOTSTRAP_SECRET no ambiente (veja .env) antes de rodar este seed.');
  process.exit(1);
}

// ─── TOTP (RFC 6238) sem dependências externas ────────────────────────────────
function base32ToBuffer(secret) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of secret.toUpperCase().replace(/=+$/, '')) {
    const idx = chars.indexOf(c);
    if (idx < 0) continue;
    bits += idx.toString(2).padStart(5, '0');
  }
  const bytes = (bits.match(/.{8}/g) || []);
  return Buffer.from(bytes.map(b => parseInt(b, 2)));
}
function generateTotp(secret, time = Date.now()) {
  const counter = Math.floor(time / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hash = createHmac('sha1', base32ToBuffer(secret)).update(buf).digest();
  const offset = hash[hash.length - 1] & 0xf;
  const otp = (
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)
  ) % 1_000_000;
  return otp.toString().padStart(6, '0');
}

let token = null;
let clinicaId = null;

// ─── HTTP helper ───────────────────────────────────────────────────────────────
async function req(method, path, body, { silent = false } = {}) {
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
  try { json = JSON.parse(text); } catch { json = { _raw: text }; }
  if (res.status >= 400 && !silent) {
    throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  }
  return { status: res.status, data: json };
}

// ─── CPF válido ────────────────────────────────────────────────────────────────
function gerarCpf() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 9));
  const dv = (base) => {
    let s = 0;
    for (let i = 0; i < base.length; i++) s += base[i] * (base.length + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = dv(n), d2 = dv([...n, d1]);
  const d = [...n, d1, d2].join('');
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

// ─── Datas helpers ─────────────────────────────────────────────────────────────
const hoje = () => new Date().toISOString().slice(0, 10);
const diasAtras = (n) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const iso = (offsetDias, hora, min = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  d.setHours(hora, min, 0, 0);
  return d.toISOString();
};
const maisMin = (isoStr, m) => new Date(new Date(isoStr).getTime() + m * 60000).toISOString();

// ─── Bootstrap ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  console.log('\n🔧 Clínica não encontrada. Execute o comando abaixo e rode o seed novamente:\n');
  console.log(`cd apps/api && npx ts-node -r tsconfig-paths/register src/cli/bootstrap-admin.ts bootstrap-admin \\`);
  console.log(`  --secret "${BOOTSTRAP_SECRET}" \\`);
  console.log(`  --nome "Clínica Nuvita Demo" \\`);
  console.log(`  --cnpj "12.345.678/0001-99" \\`);
  console.log(`  --plano profissional \\`);
  console.log(`  --admin-nome "Admin Demo" \\`);
  console.log(`  --admin-email "${ADMIN_EMAIL}" \\`);
  console.log(`  --admin-password "${ADMIN_PASS}" \\`);
  console.log(`  --fuso-horario "America/Sao_Paulo" \\`);
  console.log(`  --duracao-consulta-padrao 30\n`);
  process.exit(1);
}

// ─── Login ─────────────────────────────────────────────────────────────────────
async function login(email, password, totpSecret) {
  const body = { email, password };
  if (totpSecret) body.totpCode = generateTotp(totpSecret);
  const { status, data } = await req('POST', '/auth/login', body, { silent: true });
  if (status >= 400) return null;
  return data;
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Nuvita VaPro — Seed de dados demo\n');

  // 1) Login admin
  const adminAuth = await login(ADMIN_EMAIL, ADMIN_PASS, DEV_TOTP_SECRET);
  if (!adminAuth?.accessToken) {
    await bootstrap();
    return;
  }
  token = adminAuth.accessToken;
  clinicaId = adminAuth.user?.clinicaId ?? adminAuth.clinicaId;
  if (!clinicaId) {
    console.error('❌ Não foi possível obter clinicaId do token. Verifique o login do admin.');
    process.exit(1);
  }
  console.log(`✓ Login admin OK  |  clinicaId: ${clinicaId}`);

  // 2) Criar usuários da equipe (IDs e 2faSecret via MongoDB para consistência)
  const mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();
  const db = mongoClient.db();

  const usuarios = [
    { nome: 'Dr. Renato Cavalcanti', email: 'dr.renato@nuvita.demo', papel: 'MEDICO' },
    { nome: 'Enf. Patricia Moura', email: 'enf.patricia@nuvita.demo', papel: 'ENFERMEIRO' },
    { nome: 'Adv. Lucas Ferreira', email: 'adv.lucas@nuvita.demo', papel: 'ADVOGADO' },
    { nome: 'Sec. Camila Souza', email: 'sec.camila@nuvita.demo', papel: 'SECRETARIA' },
  ];
  const equipe = {};
  for (const u of usuarios) {
    const { status, data } = await req('POST', `/clinicas/${clinicaId}/usuarios`, {
      nome: u.nome, email: u.email, password: 'SenhaForte123!', papel: u.papel,
    }, { silent: true });

    // ID da resposta (criação nova) ou do MongoDB (já existia)
    let userId = data?.user?.id;
    const dbUser = await db.collection('users').findOne({ email: u.email.toLowerCase() });
    if (dbUser) {
      userId = userId ?? dbUser._id.toString();
      // Garantir DEV_TOTP_SECRET para login no seed (apenas papeis 2FA)
      if (PAPEIS_2FA.includes(u.papel) && dbUser['2faSecret'] !== DEV_TOTP_SECRET) {
        await db.collection('users').updateOne(
          { email: u.email.toLowerCase() },
          { $set: { '2faSecret': DEV_TOTP_SECRET } },
        );
      }
    }

    if (status >= 400 && status !== 409) {
      console.log(`  ⚠ ${u.papel} (${u.email}): ${data?.message ?? status}`);
    } else {
      console.log(`  ✓ ${u.papel}: ${u.nome} ${status === 409 ? '(já existia)' : ''}`);
    }

    const needsTotp = PAPEIS_2FA.includes(u.papel);
    const auth = await login(u.email, 'SenhaForte123!', needsTotp ? DEV_TOTP_SECRET : undefined);
    equipe[u.papel] = { id: userId ?? auth?.user?.id, token: auth?.accessToken, nome: u.nome };
  }

  await mongoClient.close();
  console.log('✓ Equipe criada');

  // 3) Criar pacientes
  const dadosPacientes = [
    // VaPro — cadeirantes, IU por retenção
    { nome: 'Maria Aparecida dos Santos',  sexo: 'FEMININO',  nasc: '1972-03-15', tel: '(11) 98001-1001', vapro: true,  perfil: 'cadeirante', diag: 'Bexiga Neurogênica pós-lesão medular T6' },
    { nome: 'José Carlos Pereira',         sexo: 'MASCULINO', nasc: '1965-08-22', tel: '(11) 98001-1002', vapro: true,  perfil: 'cadeirante', diag: 'Retenção urinária por lesão medular L2' },
    { nome: 'Silvia Regina Almeida',       sexo: 'FEMININO',  nasc: '1980-11-08', tel: '(11) 98001-1003', vapro: true,  perfil: 'cadeirante', diag: 'IU por esclerose múltipla' },
    { nome: 'Marcos Antonio Rodrigues',    sexo: 'MASCULINO', nasc: '1958-05-30', tel: '(11) 98001-1004', vapro: true,  perfil: 'cadeirante', diag: 'Retenção urinária crônica — paralisia cerebral' },
    { nome: 'Claudia Beatriz Lima',        sexo: 'FEMININO',  nasc: '1990-01-17', tel: '(11) 98001-1005', vapro: true,  perfil: 'cadeirante', diag: 'Bexiga neurogênica — espinha bífida' },
    { nome: 'Augusto Henrique Ferreira',   sexo: 'MASCULINO', nasc: '1975-09-04', tel: '(11) 98001-1006', vapro: true,  perfil: 'cadeirante', diag: 'Retenção urinária pós-AVC' },
    { nome: 'Fernanda Costa Nascimento',   sexo: 'FEMININO',  nasc: '1988-06-20', tel: '(11) 98001-1007', vapro: true,  perfil: 'cadeirante', diag: 'IU neurogênica — Parkinson' },
    // Pacientes regulares (sem VaPro)
    { nome: 'Roberto Carvalho Mendes',     sexo: 'MASCULINO', nasc: '1985-12-01', tel: '(11) 98001-1008', vapro: false, perfil: 'ativo',      diag: 'IU de esforço' },
    { nome: 'Ana Lucia Teixeira',          sexo: 'FEMININO',  nasc: '1993-04-25', tel: '(11) 98001-1009', vapro: false, perfil: 'ativo',      diag: 'Urgência urinária' },
    { nome: 'Paulo Eduardo Barros',        sexo: 'MASCULINO', nasc: '1970-07-11', tel: '(11) 98001-1010', vapro: false, perfil: 'moderado',   diag: 'Incontinência mista' },
  ];

  const pacienteIds = [];
  for (const p of dadosPacientes) {
    const { data } = await req('POST', '/pacientes', {
      clinicaId,
      nome: p.nome,
      cpf: gerarCpf(),
      dataNascimento: p.nasc,
      sexo: p.sexo,
      telefone: p.tel,
      email: (() => { const parts = p.nome.toLowerCase().split(' '); return `${parts[0]}.${parts[parts.length - 1]}@nuvita.demo`; })(),
      programaVaPro: p.vapro,
      consentimentoLGPD: { aceito: true, dataAceite: new Date().toISOString(), versao: '1.0' },
    });
    pacienteIds.push({ id: data.id, ...p });
    console.log(`  ✓ Paciente: ${p.nome} ${p.vapro ? '[VaPro]' : ''}`);
  }
  console.log(`✓ ${pacienteIds.length} pacientes criados`);

  // 4) Agendamentos (médico + enfermagem)
  const medicoId = equipe['MEDICO']?.id;
  const enfermeiroId = equipe['ENFERMEIRO']?.id;
  const agendamentos = [];
  const slots = [
    { dia: -3, hora: 9  }, { dia: -2, hora: 10 }, { dia: -2, hora: 14 },
    { dia: -1, hora: 9  }, { dia: -1, hora: 11 }, { dia:  0, hora: 9  },
    { dia:  0, hora: 10 }, { dia:  0, hora: 14 }, { dia:  1, hora: 9  },
    { dia:  1, hora: 11 },
  ];
  for (let i = 0; i < Math.min(pacienteIds.length, slots.length); i++) {
    const slot = slots[i];
    const pac = pacienteIds[i];
    const isVapro = pac.vapro;
    const inicio = iso(slot.dia, slot.hora);
    const fim = maisMin(inicio, 30);
    const { data } = await req('POST', '/agendamentos', {
      clinicaId,
      pacienteId: pac.id,
      medicoId: isVapro ? enfermeiroId : medicoId,
      modalidade: isVapro ? 'enfermagem' : 'medico',
      dataHoraInicio: inicio,
      dataHoraFim: fim,
      tipo: isVapro ? 'atendimento_enfermagem' : 'consulta',
      observacoes: isVapro ? `Avaliação IU — ${pac.diag}` : 'Consulta de rotina',
    });
    agendamentos.push({ id: data.id, pacienteId: pac.id, vapro: isVapro });
  }
  console.log(`✓ ${agendamentos.length} agendamentos criados`);

  // 5) Avaliações IU (como enfermeiro)
  token = equipe['ENFERMEIRO']?.token;
  if (!token) { console.log('⚠ Token de enfermeiro não disponível, pulando avaliações'); }

  const vaproIds = pacienteIds.filter(p => p.vapro);
  const avaliacaoIds = [];

  const produtosFeminino = [
    { codigo: 72082, sexo: 'feminino', french: 8 },
    { codigo: 72102, sexo: 'feminino', french: 10 },
    { codigo: 72122, sexo: 'feminino', french: 12 },
  ];
  const produtosMasculino = [
    { codigo: 72084, sexo: 'masculino', french: 8 },
    { codigo: 72104, sexo: 'masculino', french: 10 },
    { codigo: 72124, sexo: 'masculino', french: 12 },
  ];

  for (let i = 0; i < vaproIds.length; i++) {
    const pac = vaproIds[i];
    const isFem = pac.sexo === 'FEMININO';
    const produtos = isFem ? produtosFeminino : produtosMasculino;
    const produto = produtos[i % produtos.length];
    const agAtual = agendamentos.find(a => a.pacienteId === pac.id);

    const { data } = await req('POST', '/avaliacao-iu', {
      clinicaId,
      pacienteId: pac.id,
      agendamentoId: agAtual?.id,
      dataAtendimento: new Date(Date.now() - (i + 1) * 86400000 * 3).toISOString(),
      local: 'residencia',
      motivoIU: pac.diag,
      inicioSintomas: `${Math.floor(Math.random() * 5) + 1} anos`,
      perfilCliente: 'cadeirante',
      destreza: i % 3 === 0 ? 'reduzida' : 'preservada',
      dntui: true,
      tiposIU: ['retencao_transbordamento'],
      miccaoEspontanea: false,
      volumeAproximadoMl: 300 + i * 50,
      realizaCateterismo: true,
      cateterismosDia: 4 + (i % 3),
      cateterUtilizado: 'Cateter de látex sem revestimento',
      ultimaInfeccaoUrinaria: diasAtras(30 + i * 15),
      emTratamento: false,
      produtoIndicado: produto,
      responsavelCateterismo: i % 2 === 0 ? 'proprio_paciente' : 'cuidador',
      autorizaPesquisa: true,
      aceitaInformacoes: true,
      encaminhamento: 'polo_sus',
      coren: '12345-SP',
    });
    avaliacaoIds.push({ id: data.id, pacienteId: pac.id, produto, sexo: pac.sexo });
    console.log(`  ✓ Avaliação IU: ${pac.nome}`);
  }
  console.log(`✓ ${avaliacaoIds.length} avaliações IU criadas`);

  // 6) Follow-ups
  // Status: elegível (4), em_avaliacao (2), nao_elegivel (1)
  const followupIds = [];
  const statusMap = ['elegivel', 'elegivel', 'elegivel', 'elegivel', 'em_avaliacao', 'em_avaliacao', 'nao_elegivel'];
  for (let i = 0; i < avaliacaoIds.length; i++) {
    const av = avaliacaoIds[i];
    const status = statusMap[i] ?? 'em_avaliacao';
    const { data } = await req('POST', '/followup', {
      clinicaId,
      pacienteId: av.pacienteId,
      avaliacaoIuId: av.id,
      dataFollowup: diasAtras(Math.max(1, 7 - i)),
      statusElegibilidade: status,
      observacoes: status === 'elegivel'
        ? 'Paciente elegível conforme critérios do programa VaPro/SUS. Renda per capita abaixo de 1 SM, cadeirante, diagnóstico confirmado.'
        : status === 'nao_elegivel'
          ? 'Paciente não atendeu aos critérios de renda per capita do programa.'
          : 'Aguardando documentação complementar para confirmar elegibilidade.',
      proximoFollowup: status === 'em_avaliacao' ? hoje() : undefined,
    });
    followupIds.push({ id: data.id, pacienteId: av.pacienteId, avaliacaoId: av.id, status, produto: av.produto, sexo: av.sexo });
    console.log(`  ✓ Follow-up [${status}]: paciente ${i + 1}`);
  }
  console.log(`✓ ${followupIds.length} follow-ups criados`);

  // 7) Laudos médicos (como médico) — só para elegíveis
  token = equipe['MEDICO']?.token;
  const elegiveis = followupIds.filter(f => f.status === 'elegivel');
  const laudoIds = [];

  for (const f of elegiveis) {
    const isFem = f.sexo === 'FEMININO';
    const { data: laudo } = await req('POST', '/laudo-medico', {
      clinicaId,
      pacienteId: f.pacienteId,
      avaliacaoIuId: f.avaliacaoId,
      dataLaudo: diasAtras(Math.floor(Math.random() * 5) + 1),
      cid10: ['N31.9', 'G82.2'],
      justificativaMedica: `Paciente portador(a) de bexiga neurogênica com necessidade de cateterismo intermitente limpo (CIL) para esvaziamento vesical. O uso do cateter VaPro/Hollister com revestimento lubrificado é essencial para redução de infecções urinárias recorrentes, manutenção da qualidade de vida e preservação da função renal. Conforme protocolo clínico DATASUS e RDC ANVISA nº 11/2014.`,
      fundamentoLegal: 'Art. 196 CF/88 — Direito à saúde. Lei 8.080/90 — SUS. Portaria MS 1.083/2012 — CIL. Resolução CFM 1.957/2010.',
      produtosSolicitados: [
        {
          codigo: f.produto.codigo,
          descricao: `Cateter VaPro Hollister ${isFem ? 'Feminino' : 'Masculino'} Fr${f.produto.french}`,
          quantidade: 120,
          unidade: 'unidade',
          codigoSiafisico: isFem ? 9206 : 9207,
        },
      ],
      crmNumero: '123456-SP',
    });

    // Assinar laudo
    await req('POST', `/laudo-medico/${laudo.id}/assinar`, {}, { silent: true });
    laudoIds.push({ id: laudo.id, pacienteId: f.pacienteId, avaliacaoId: f.avaliacaoId });
    console.log(`  ✓ Laudo médico assinado: paciente ${laudoIds.length}`);
  }
  console.log(`✓ ${laudoIds.length} laudos médicos criados e assinados`);

  // 8) Processos jurídicos (como advogado)
  token = equipe['ADVOGADO']?.token;
  const processoIds = [];
  const statusProcesso = ['em_preparacao', 'protocolado', 'em_andamento', 'ganho'];

  for (let i = 0; i < laudoIds.length; i++) {
    const l = laudoIds[i];
    const { data: proc } = await req('POST', '/processo-juridico', {
      clinicaId,
      pacienteId: l.pacienteId,
      avaliacaoIuId: l.avaliacaoId,
      laudoMedicoId: l.id,
      observacoes: 'Ação judicial para fornecimento de cateter VaPro pelo SUS. Direito à saúde — art. 196 CF/88.',
    });

    const status = statusProcesso[i % statusProcesso.length];
    // Avançar status se necessário
    if (status !== 'em_preparacao') {
      const statusProgresso = ['em_preparacao', 'protocolado', 'em_andamento', 'ganho'];
      const idx = statusProgresso.indexOf(status);
      for (let s = 1; s <= idx; s++) {
        await req('PATCH', `/processo-juridico/${proc.id}/status`, {
          status: statusProgresso[s],
          numeroProcesso: s >= 1 ? `${2024 + i}.001.${String(i + 1).padStart(6, '0')}` : undefined,
          tribunal: s >= 1 ? 'TJSP — 3ª Vara da Fazenda Pública' : undefined,
        }, { silent: true });
      }
    }

    // Adicionar documento ao processo
    await req('POST', `/processo-juridico/${proc.id}/documento`, {
      nome: 'Petição Inicial',
      url: `https://drive.google.com/file/d/demo-peticao-${proc.id}`,
      tipo: 'petição',
    }, { silent: true });

    if (i < 2) {
      await req('POST', `/processo-juridico/${proc.id}/documento`, {
        nome: 'Laudo Médico Anexo',
        url: `https://drive.google.com/file/d/demo-laudo-${l.id}`,
        tipo: 'laudo',
      }, { silent: true });
    }

    processoIds.push({ id: proc.id, pacienteId: l.pacienteId, status });
    console.log(`  ✓ Processo jurídico [${status}]: ${proc.id.slice(-6)}`);
  }
  console.log(`✓ ${processoIds.length} processos jurídicos criados`);

  // 9) Entregas — para processos "ganho"
  token = adminAuth.accessToken;
  const processoGanho = processoIds.filter(p => p.status === 'ganho');
  for (const proc of processoGanho) {
    const { data: entrega } = await req('POST', '/entregas', {
      clinicaId,
      pacienteId: proc.pacienteId,
      processoJuridicoId: proc.id,
      quantidadeEntregue: 120,
      observacoes: 'Primeira entrega via farmácia de alto custo — UBS Central',
    }, { silent: true });
    if (entrega?.id) {
      await req('POST', `/entregas/${entrega.id}/confirmar`, {}, { silent: true });
      console.log(`  ✓ Entrega confirmada para processo ${proc.id.slice(-6)}`);
    }
  }

  // ─── Resumo ───────────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(56));
  console.log('✅ SEED CONCLUÍDO\n');
  console.log(`  Clínica ID  : ${clinicaId}`);
  console.log(`  Pacientes   : ${pacienteIds.length} (${vaproIds.length} VaPro + ${pacienteIds.length - vaproIds.length} regulares)`);
  console.log(`  Agendamentos: ${agendamentos.length}`);
  console.log(`  Avaliações  : ${avaliacaoIds.length}`);
  console.log(`  Follow-ups  : ${followupIds.length} (${elegiveis.length} elegíveis)`);
  console.log(`  Laudos      : ${laudoIds.length} (todos assinados)`);
  console.log(`  Processos   : ${processoIds.length}`);
  console.log(`  Entregas    : ${processoGanho.length}`);
  console.log('\n  Credenciais de acesso:');
  console.log(`  Admin      → ${ADMIN_EMAIL} / SenhaForte123!`);
  console.log(`  Médico     → dr.renato@nuvita.demo / SenhaForte123!`);
  console.log(`  Enfermeiro → enf.patricia@nuvita.demo / SenhaForte123!`);
  console.log(`  Advogado   → adv.lucas@nuvita.demo / SenhaForte123!`);
  console.log(`  Secretaria → sec.camila@nuvita.demo / SenhaForte123!\n`);
}

main().catch((e) => {
  console.error('\n❌ Seed falhou:', e.message);
  process.exit(1);
});
