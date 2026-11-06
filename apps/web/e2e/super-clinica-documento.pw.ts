import { test, expect, type Page } from '@playwright/test';

// Diálogo "Editar clínica" do SUPER_ADMIN (SuperAdminPage real) com documento + tipoDocumento.
// API simulada; o servidor é o gate (400/422 par inválido, 409 duplicata).

const SUPER = { id: 'sa1', nome: 'Erico', email: 'sa@nuvita.test', papel: 'SUPER_ADMIN', clinicaId: null };
const ADMIN = { id: 'u1', nome: 'Admin', email: 'adm@exemplo.example', papel: 'ADMIN', clinicaId: 'cli-1' };
const CLINICA = {
  id: 'cli-1', nome: 'Clínica Teste', documento: '11222333000181', tipoDocumento: 'CNPJ',
  plano: 'basico', ativo: true, faseTeste: true, criadoEm: '2026-01-01T00:00:00.000Z', totalUsuarios: 2,
};
const OUTRO_CNPJ_VALIDO = '55.747.955/0001-07';

async function abrirEdicao(page: Page, patch?: { status: number; json: unknown }) {
  const patches: Record<string, unknown>[] = [];
  await page.addInitScript((u) => {
    localStorage.setItem('nuvita.accessToken', 'token-de-teste');
    localStorage.setItem('nuvita.user', JSON.stringify(u));
  }, SUPER);
  await page.route('**/super-admin/usuarios**', (r) => r.fulfill({ json: { items: [], total: 0 } }));
  await page.route('**/super-admin/clinicas', (r) => r.fulfill({ json: { items: [CLINICA], total: 1 } }));
  await page.route('**/clinicas/cli-1/logo**', (r) => r.fulfill({ status: 404, json: {} }));
  await page.route('**/super-admin/clinicas/cli-1', (r) => {
    patches.push(r.request().postDataJSON());
    return r.fulfill({ status: patch?.status ?? 200, json: patch?.json ?? { ...CLINICA } });
  });
  await page.goto('/super.html');
  await page.getByRole('tab', { name: 'Clínicas' }).click();
  await page.getByTitle('Editar').click();
  await expect(page.getByRole('dialog')).toContainText('Editar clínica');
  return patches;
}

const tipo = (page: Page) => page.getByRole('dialog').getByLabel('Tipo de documento');
const doc = (page: Page) => page.getByRole('dialog').getByLabel('Documento', { exact: true });
const salvar = (page: Page) => page.getByRole('button', { name: 'Salvar alterações' }).click();

async function escolherTipo(page: Page, rotulo: RegExp) {
  await tipo(page).click();
  await page.getByRole('option', { name: rotulo }).click();
}

test.describe('Editar clínica — documento fiscal (SUPER_ADMIN)', () => {
  test('1. campos aparecem pré-preenchidos (tipo e documento com máscara)', async ({ page }) => {
    await abrirEdicao(page);
    await expect(tipo(page)).toContainText('CNPJ');
    await expect(doc(page)).toHaveValue('11.222.333/0001-81');
  });

  test('2. par válido novo: o PATCH leva OS DOIS (documento normalizado)', async ({ page }) => {
    const patches = await abrirEdicao(page);
    await escolherTipo(page, /CPF/);
    await doc(page).fill('52998224725');
    await doc(page).blur();
    await expect(doc(page)).toHaveValue('529.982.247-25');
    await salvar(page);
    await expect.poll(() => patches.length).toBe(1);
    expect(patches[0]).toMatchObject({ tipoDocumento: 'CPF', documento: '52998224725', nome: 'Clínica Teste' });
  });

  test('3. sem mexer no documento, o PATCH não leva tipoDocumento nem documento', async ({ page }) => {
    const patches = await abrirEdicao(page);
    await page.getByRole('dialog').getByLabel('Nome').fill('Clínica Renomeada');
    await salvar(page);
    await expect.poll(() => patches.length).toBe(1);
    expect(patches[0]).toMatchObject({ nome: 'Clínica Renomeada' });
    expect(patches[0]).not.toHaveProperty('documento');
    expect(patches[0]).not.toHaveProperty('tipoDocumento');
  });

  test('4. CNPJ de 11 dígitos é barrado no cliente (conveniência), sem PATCH', async ({ page }) => {
    const patches = await abrirEdicao(page);
    await doc(page).fill('03294572689');
    await salvar(page);
    await expect(page.getByRole('dialog')).toContainText('CNPJ inválido');
    expect(patches).toHaveLength(0);
  });

  for (const status of [400, 422]) {
    test(`5. servidor recusa o par (${status}): mensagem clara, diálogo segue aberto`, async ({ page }) => {
      const patches = await abrirEdicao(page, { status, json: { message: ['CNPJ inválido.'] } });
      await doc(page).fill(OUTRO_CNPJ_VALIDO); // passa no cliente; só o servidor (simulado) recusa
      await salvar(page);
      await expect.poll(() => patches.length).toBe(1);
      await expect(page.getByTestId('erro-documento-fiscal')).toContainText('Documento inválido para o tipo escolhido');
      await expect(page.getByTestId('erro-documento-fiscal')).not.toContainText('Request failed');
      await expect(page.getByRole('dialog')).toBeVisible();
    });
  }

  test('6. 409 (documento de outra clínica): mensagem de duplicata', async ({ page }) => {
    const patches = await abrirEdicao(page, { status: 409, json: { message: 'CNPJ já cadastrado.' } });
    await doc(page).fill(OUTRO_CNPJ_VALIDO);
    await salvar(page);
    await expect.poll(() => patches.length).toBe(1);
    await expect(page.getByTestId('erro-documento-fiscal')).toContainText('já está cadastrado em outra clínica');
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});

test('7. a tela do ADMIN (ClinicaPage) NÃO tem os campos de documento editáveis', async ({ page }) => {
  await page.addInitScript((u) => {
    localStorage.setItem('nuvita.accessToken', 'token-de-teste');
    localStorage.setItem('nuvita.user', JSON.stringify(u));
  }, ADMIN);
  await page.route('**/clinicas/minha', (r) =>
    r.fulfill({ json: { nome: 'Clínica Teste', documento: '11222333000181', tipoDocumento: 'CNPJ' } }),
  );
  await page.goto('/logo.html');
  await expect(page.getByRole('button', { name: /adicionar logo/i })).toBeVisible(); // a página carregou
  await expect(page.getByLabel('Tipo de documento')).toHaveCount(0);
  await expect(page.getByLabel('Documento', { exact: true })).toHaveCount(0);
});
