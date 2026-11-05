import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// MATRIZ perfil × rota do web: para cada papel, tenta o acesso DIRETO (URL) a cada rota e confere se
// entra (caminho final = pedido) ou é barrado (volta para /dashboard). Esconder no menu NUNCA é a proteção.
// Roda no CI (job Web — E2E). Rota nova no web sem linha aqui NÃO é detectada por este arquivo: o teste
// `rotas-declaradas` (no fim do arquivo) compara com o conjunto de rotas reais de routes.tsx e FALHA.

type Papel = 'SUPER_ADMIN' | 'ADMIN' | 'ENFERMEIRO' | 'SECRETARIA' | 'PACIENTE';
const PAPEIS: Papel[] = ['SUPER_ADMIN', 'ADMIN', 'ENFERMEIRO', 'SECRETARIA', 'PACIENTE'];

const ROTAS: Array<[string, string, Papel[]]> = [
  ['/dashboard', '/dashboard', PAPEIS],
  ['/pacientes', '/pacientes', ['SUPER_ADMIN', 'ADMIN', 'ENFERMEIRO', 'SECRETARIA']],
  ['/pacientes/:id', '/pacientes/p1', ['SUPER_ADMIN', 'ADMIN', 'ENFERMEIRO', 'SECRETARIA']],
  ['/fluxo-clinico', '/fluxo-clinico', ['SUPER_ADMIN', 'ADMIN', 'ENFERMEIRO', 'SECRETARIA']],
  ['/captacao-pacientes', '/captacao-pacientes', ['SUPER_ADMIN', 'ADMIN', 'ENFERMEIRO', 'SECRETARIA']],
  ['/financeiro-pacientes', '/financeiro-pacientes', ['SUPER_ADMIN', 'ADMIN', 'ENFERMEIRO', 'SECRETARIA']],
  // documentos clínicos e impressão do prontuário: PRIVATIVOS do enfermeiro
  ['/pacientes/:id/prontuario/:prontuarioId/imprimir', '/pacientes/p1/prontuario/r1/imprimir', ['ENFERMEIRO']],
  ['/pacientes/:id/documentos/atestado', '/pacientes/p1/documentos/atestado', ['ENFERMEIRO']],
  ['/pacientes/:id/documentos/laudo', '/pacientes/p1/documentos/laudo', ['ENFERMEIRO']],
  ['/pacientes/:id/documentos/encaminhamento', '/pacientes/p1/documentos/encaminhamento', ['ENFERMEIRO']],
  ['/pacientes/:id/documentos/prescricao', '/pacientes/p1/documentos/prescricao', ['ENFERMEIRO']],
  // consulta de enfermagem (etapa 5a): conteúdo clínico, só ENFERMEIRO
  ['/pacientes/:id/consultas/:consultaId', '/pacientes/p1/consultas/c1', ['ENFERMEIRO']],
  ['/pacientes/:id/documentos/declaracao-comparecimento', '/pacientes/p1/documentos/declaracao-comparecimento', ['ADMIN', 'ENFERMEIRO', 'SECRETARIA']],
  ['/agenda', '/agenda', ['SUPER_ADMIN', 'ADMIN', 'ENFERMEIRO', 'SECRETARIA']],
  ['/prontuarios', '/prontuarios', ['SUPER_ADMIN']],
  ['/documentos', '/documentos', ['SUPER_ADMIN', 'ADMIN', 'ENFERMEIRO', 'SECRETARIA']],
  ['/notificacoes', '/notificacoes', ['SUPER_ADMIN', 'ADMIN', 'SECRETARIA']],
  ['/telemedicina', '/telemedicina', ['SUPER_ADMIN', 'ADMIN', 'ENFERMEIRO']],
  ['/atendimento-psicologico', '/atendimento-psicologico', ['SUPER_ADMIN', 'ENFERMEIRO']],
  ['/financeiro-psicologia', '/financeiro-psicologia', ['SUPER_ADMIN', 'ENFERMEIRO']],
  ['/clinica', '/clinica', ['SUPER_ADMIN', 'ADMIN']],
  ['/catalogo-produtos', '/catalogo-produtos', ['SUPER_ADMIN', 'ADMIN']],
  ['/relatorios', '/relatorios', ['SUPER_ADMIN', 'ADMIN', 'ENFERMEIRO', 'SECRETARIA']],
  ['/super-admin', '/super-admin', ['SUPER_ADMIN']],
  ['/tickets', '/tickets', ['SUPER_ADMIN']],
];

const USUARIO = (papel: Papel) => ({
  id: 'u1', nome: 'Teste', email: 't@clinica.example', papel, clinicaId: papel === 'SUPER_ADMIN' ? null : 'cli-1',
  deveTrocarSenha: false, faseTeste: false, termosAceitos: { versao: '2.0', dataAceite: '2026-10-01T00:00:00.000Z' }, coren: '06/123',
});

for (const papel of PAPEIS) {
  test.describe(`Matriz de rotas — ${papel}`, () => {
    for (const [rotulo, url, permitidos] of ROTAS) {
      const entra = permitidos.includes(papel);
      test(`${entra ? 'ENTRA' : 'É BARRADO'} em ${rotulo}`, async ({ page }) => {
        await page.addInitScript((u) => {
          localStorage.setItem('nuvita.accessToken', 'token-de-teste');
          localStorage.setItem('nuvita.user', JSON.stringify(u));
        }, USUARIO(papel));
        await page.route('**/*', (r) => {
          const t = r.request().resourceType();
          return t === 'fetch' || t === 'xhr' ? r.fulfill({ json: { items: [], total: 0 } }) : r.fallback();
        });
        await page.goto(`/rotas.html#${url}`);
        const sonda = page.locator('#sonda');
        await expect(sonda).toBeAttached();
        await page.waitForTimeout(600); // deixa os redirects assentarem
        const final = await sonda.getAttribute('data-pathname');
        if (entra) expect(final).toBe(url);
        else expect(final).not.toBe(url);
      });
    }
  });
}

test('rota inexistente cai no dashboard para todo papel logado', async ({ page }) => {
  await page.addInitScript((u) => {
    localStorage.setItem('nuvita.accessToken', 'token-de-teste');
    localStorage.setItem('nuvita.user', JSON.stringify(u));
  }, USUARIO('PACIENTE'));
  await page.route('**/*', (r) => (['fetch', 'xhr'].includes(r.request().resourceType()) ? r.fulfill({ json: { items: [], total: 0 } }) : r.fallback()));
  await page.goto('/rotas.html#/rota-que-nao-existe');
  await expect(page.locator('#sonda')).toBeAttached();
  await page.waitForTimeout(400);
  expect(await page.locator('#sonda').getAttribute('data-pathname')).toBe('/dashboard');
});

// Rotas fora da matriz de papéis, cada uma com o motivo. Rota nova em routes.tsx precisa entrar em ROTAS
// (com os papéis permitidos) ou aqui (com justificativa); senão o teste reprova.
const FORA_DA_MATRIZ: Record<string, string> = {
  '/login': 'pública: tela de login',
  '/esqueci-senha': 'pública: pedido de link de redefinição de senha (resposta idêntica para qualquer e-mail)',
  '/redefinir-senha': 'pública: a credencial é o token de uso único do e-mail',
  '/tele/:token': 'pública: a credencial é o token da sala (paciente)',
  '/captacao_pacientes': 'pública: a credencial é o PIN dos captadores, validado pela API (header x-captador-pin)',
  '/aceitar-termos': 'gate de sessão (GateChain): vale para qualquer papel logado',
  '/definir-senha': 'gate de sessão (GateChain): vale para qualquer papel logado',
  '/': 'redireciona para /dashboard',
  '*': 'rota desconhecida: redireciona para /dashboard (coberto pelo teste acima)',
};

test('rotas-declaradas: toda rota real de routes.tsx tem linha na matriz do web', () => {
  const fonte = readFileSync(resolve(process.cwd(), 'src/routes.tsx'), 'utf-8');
  const gates = readFileSync(resolve(process.cwd(), 'src/auth/GateChain.tsx'), 'utf-8');
  const constante = (nome: string) => new RegExp(`${nome}\\s*=\\s*'([^']+)'`).exec(gates)?.[1];
  const reais = new Set<string>();
  for (const m of fonte.matchAll(/<Route\s+path=(?:"([^"]+)"|\{([A-Z_]+)\})/g)) {
    const caminho = m[1] ?? constante(m[2]);
    expect(caminho, `constante de rota ${m[2]} não resolvida`).toBeTruthy();
    reais.add(caminho as string);
  }
  // <Route> de layout (sem path) é aceito; <Route index> ou path fora do padrão reprova
  expect(fonte).not.toMatch(/<Route\s+index/);
  expect(reais.size).toBeGreaterThan(20);

  const declaradas = new Set([...ROTAS.map(([rotulo]) => rotulo), ...Object.keys(FORA_DA_MATRIZ)]);
  const semLinha = [...reais].filter((r) => !declaradas.has(r));
  expect(semLinha, 'rota em routes.tsx sem linha na matriz do web').toEqual([]);

  const obsoletas = [...declaradas].filter((d) => !reais.has(d));
  expect(obsoletas, 'linha da matriz sem rota em routes.tsx').toEqual([]);
});
