// Percorre TODAS as rotas do web com um perfil e registra o que acontece (gate de rota real, tela,
// erros de API). Uso: CONTAS=<contas.json fora do repo> node tour.mjs <perfil>
import { abrir, observar, foto, fatos, salvarResultado, entrar, lerContas, BASE, totp } from './lib.mjs';

const perfil = process.argv[2];
const contas = lerContas(process.env.CONTAS);
const conta = contas[perfil];
if (!conta) throw new Error('perfil desconhecido: ' + perfil);

// ids da clínica de demonstração (obtidos pela API com a conta do psicólogo; sem dado real).
const ids = contas.ids;
const ROTAS = [
  ['dashboard', '/dashboard'],
  ['pacientes', '/pacientes'],
  ['paciente-ficha', `/pacientes/${ids.pacienteId}`],
  ['imprimir-prontuario', `/pacientes/${ids.pacienteId2}/prontuario/${ids.prontuarioId}/imprimir`],
  ['doc-atestado', `/pacientes/${ids.pacienteId}/documentos/atestado`],
  ['doc-laudo', `/pacientes/${ids.pacienteId}/documentos/laudo`],
  ['doc-encaminhamento', `/pacientes/${ids.pacienteId}/documentos/encaminhamento`],
  ['doc-prescricao', `/pacientes/${ids.pacienteId}/documentos/prescricao`],
  ['agenda', '/agenda'],
  ['prontuarios', '/prontuarios'],
  ['documentos', '/documentos'],
  ['notificacoes', '/notificacoes'],
  ['telemedicina', '/telemedicina'],
  ['atendimento-psicologico', '/atendimento-psicologico'],
  ['financeiro-psicologia', '/financeiro-psicologia'],
  ['clinica', '/clinica'],
  ['relatorios', '/relatorios'],
  ['super-admin', '/super-admin'],
  ['tickets', '/tickets'],
  ['rota-inexistente', '/rota-que-nao-existe'],
];

const { browser, ctx } = await abrir();
const page = await ctx.newPage();
const obs = observar(page);
const destinoLogin = await entrar(page, conta);
console.log(`[${perfil}] depois do login: ${destinoLogin}`);
const saida = { perfil, depoisDoLogin: destinoLogin, rotas: [] };
await foto(page, `perfis/${perfil}/00-pos-login.png`);

for (const [slug, rota] of ROTAS) {
  obs.limpar();
  await page.goto(BASE + rota);
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(900);
  const f = await fatos(page);
  const corpo = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 260);
  const img = await foto(page, `perfis/${perfil}/${slug}.png`);
  saida.rotas.push({ slug, pedida: rota.replace(ids.pacienteId, ':id'), final: f.url.replace(ids.pacienteId, ':id'), redirecionou: f.url !== rota, titulos: f.titulos, menu: f.links, botoes: f.botoes.slice(0, 15), erros: obs.erros.map((e) => `${e.status} ${e.metodo} ${e.url.replace(ids.pacienteId, ':id')}`), consoleErros: obs.consoleErros.length, texto: corpo, img });
  console.log(`  ${slug.padEnd(24)} -> ${f.url.replace(ids.pacienteId, ':id').padEnd(34)} ${obs.erros.length ? 'ERR ' + obs.erros.map((e) => e.status + ' ' + e.url.slice(0, 30)).join(',') : ''}`);
}
salvarResultado(`tour-${perfil}`, saida);
await browser.close();
