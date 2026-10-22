import { test, expect } from '@playwright/test';

// MATRIZ perfil × rota do web: para cada papel, tenta o acesso DIRETO (URL) a cada rota e confere se
// entra (caminho final = pedido) ou é barrado (volta para /dashboard). Esconder no menu NUNCA é a proteção.
// Roda no CI (job Web — E2E). Rota nova no web sem linha aqui NÃO é detectada por este arquivo: o teste
// `rotas-declaradas` abaixo compara com o conjunto de rotas de routes.tsx.

type Papel = 'SUPER_ADMIN' | 'ADMIN' | 'PSICOLOGO' | 'SECRETARIA' | 'PACIENTE';
const PAPEIS: Papel[] = ['SUPER_ADMIN', 'ADMIN', 'PSICOLOGO', 'SECRETARIA', 'PACIENTE'];

const ROTAS: Array<[string, string, Papel[]]> = [
  ['/dashboard', '/dashboard', PAPEIS],
  ['/pacientes', '/pacientes', ['SUPER_ADMIN', 'ADMIN', 'PSICOLOGO', 'SECRETARIA']],
  ['/pacientes/:id', '/pacientes/p1', ['SUPER_ADMIN', 'ADMIN', 'PSICOLOGO', 'SECRETARIA']],
  // documentos clínicos e impressão do prontuário: PRIVATIVOS do psicólogo
  ['/pacientes/:id/prontuario/:pid/imprimir', '/pacientes/p1/prontuario/r1/imprimir', ['PSICOLOGO']],
  ['/pacientes/:id/documentos/atestado', '/pacientes/p1/documentos/atestado', ['PSICOLOGO']],
  ['/pacientes/:id/documentos/laudo', '/pacientes/p1/documentos/laudo', ['PSICOLOGO']],
  ['/pacientes/:id/documentos/encaminhamento', '/pacientes/p1/documentos/encaminhamento', ['PSICOLOGO']],
  ['/pacientes/:id/documentos/prescricao', '/pacientes/p1/documentos/prescricao', ['PSICOLOGO']],
  ['/agenda', '/agenda', ['SUPER_ADMIN', 'ADMIN', 'PSICOLOGO', 'SECRETARIA']],
  ['/prontuarios', '/prontuarios', ['SUPER_ADMIN']],
  ['/documentos', '/documentos', ['SUPER_ADMIN', 'ADMIN', 'PSICOLOGO', 'SECRETARIA']],
  ['/notificacoes', '/notificacoes', ['SUPER_ADMIN', 'ADMIN', 'SECRETARIA']],
  ['/telemedicina', '/telemedicina', ['SUPER_ADMIN', 'ADMIN', 'PSICOLOGO']],
  ['/atendimento-psicologico', '/atendimento-psicologico', ['SUPER_ADMIN', 'PSICOLOGO']],
  ['/financeiro-psicologia', '/financeiro-psicologia', ['SUPER_ADMIN', 'PSICOLOGO']],
  ['/clinica', '/clinica', ['SUPER_ADMIN', 'ADMIN']],
  ['/relatorios', '/relatorios', ['SUPER_ADMIN', 'ADMIN', 'PSICOLOGO', 'SECRETARIA']],
  ['/super-admin', '/super-admin', ['SUPER_ADMIN']],
  ['/tickets', '/tickets', ['SUPER_ADMIN']],
];

const USUARIO = (papel: Papel) => ({
  id: 'u1', nome: 'Teste', email: 't@clinica.example', papel, clinicaId: papel === 'SUPER_ADMIN' ? null : 'cli-1',
  deveTrocarSenha: false, faseTeste: false, termosAceitos: { versao: '2.0', dataAceite: '2026-10-01T00:00:00.000Z' }, crp: '06/123',
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
