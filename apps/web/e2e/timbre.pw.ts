import { test, expect, type Page } from '@playwright/test';

// Verificação do timbre clínico NO DOCUMENTO RENDERIZADO (componentes reais, dados fixos).
// A sessão (localStorage) e o GET /clinicas/minha são simulados aqui; nada vai ao backend.

const CLINICA = {
  nome: 'Clínica Mente Sã',
  documento: '12.345.678/0001-95',
  tipoDocumento: 'CNPJ',
  endereco: { logradouro: 'Rua das Acácias', numero: '120', bairro: 'Centro', cidade: 'Belo Horizonte', estado: 'MG', cep: '30110-000' },
  telefone: '(31) 3333-4444',
  emailContato: 'contato@mentesa.example',
  logoUrl: 'https://cdn.example/clinica-logo.png',
};

const PSICOLOGO = { id: 'u1', nome: 'Dra. Ana Souza', email: 'ana@mentesa.example', papel: 'PSICOLOGO', clinicaId: 'c1', crp: '06/12345' };
const SECRETARIA = { id: 'u2', nome: 'Bia Secretaria', email: 'bia@mentesa.example', papel: 'SECRETARIA', clinicaId: 'c1' };

async function abrir(page: Page, user: Record<string, unknown>, clinica: Record<string, unknown> | null = CLINICA) {
  await page.addInitScript((u) => {
    localStorage.setItem('nuvita.accessToken', 'token-de-teste');
    localStorage.setItem('nuvita.user', JSON.stringify(u));
  }, user);
  await page.route('**/clinicas/minha', (route) =>
    clinica
      ? route.fulfill({ json: clinica })
      : route.fulfill({ status: 500, json: { message: 'sem clínica' } }),
  );
  // Logo remoto da clínica: devolve um PNG 1x1 para não depender de rede.
  await page.route('https://cdn.example/**', (route) =>
    route.fulfill({
      contentType: 'image/png',
      body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'),
    }),
  );
  await page.goto('/');
}

test.describe('timbre clínico dinâmico', () => {
  test('1. cabeçalho mostra a clínica: nome, CNPJ, endereço, telefone e e-mail', async ({ page }) => {
    await abrir(page, PSICOLOGO);
    const cab = page.locator('header');
    await expect(cab).toContainText('Clínica Mente Sã');
    await expect(cab).toContainText('CNPJ: 12.345.678/0001-95');
    await expect(cab).toContainText('Rua das Acácias');
    await expect(cab).toContainText('(31) 3333-4444');
    await expect(cab).toContainText('contato@mentesa.example');
  });

  test('1b. clínica pessoa física (CPF) rotula "CPF:"', async ({ page }) => {
    await abrir(page, PSICOLOGO, { ...CLINICA, documento: '529.982.247-25', tipoDocumento: 'CPF' });
    await expect(page.locator('header')).toContainText('CPF: 529.982.247-25');
    await expect(page.locator('header')).not.toContainText('CNPJ');
  });

  test('2. o documento não contém 7Safe, CNPJ da 7Safe, Nuvita nem Dealer', async ({ page }) => {
    await abrir(page, PSICOLOGO);
    await expect(page.locator('header')).toContainText('Clínica Mente Sã'); // espera o timbre carregar
    const texto = await page.locator('.documento-clinico-print').innerText();
    for (const proibido of ['7Safe', '55.747.955/0001-07', 'Nuvita', 'Dealer']) {
      expect(texto, `contém "${proibido}"`).not.toContain(proibido);
    }
    const html = await page.locator('.documento-clinico-print').innerHTML();
    expect(html.toLowerCase()).not.toContain('nuvita');
  });

  test('3. assinatura mostra "<nome> — CRP <crp>"', async ({ page }) => {
    await abrir(page, PSICOLOGO);
    await expect(page.getByTestId('assinatura')).toContainText('Dra. Ana Souza — CRP 06/12345');
  });

  test('4. clínica sem logo: cabeçalho textual, sem <img> e sem logo do Nuvita', async ({ page }) => {
    const { logoUrl: _l, ...semLogo } = CLINICA;
    await abrir(page, PSICOLOGO, semLogo);
    const cab = page.locator('header');
    await expect(cab).toContainText('Clínica Mente Sã');
    await expect(cab.locator('img')).toHaveCount(0);
    await expect(cab.locator('svg')).toHaveCount(0);
  });

  test('4b. clínica com logo mostra o logo DA CLÍNICA', async ({ page }) => {
    await abrir(page, PSICOLOGO);
    await expect(page.locator('header img')).toHaveAttribute('src', CLINICA.logoUrl);
  });

  test('5. campo opcional vazio some, sem rótulo em branco', async ({ page }) => {
    const { telefone: _t, emailContato: _e, endereco: _a, ...parcial } = CLINICA;
    await abrir(page, PSICOLOGO, parcial);
    const cab = page.locator('header');
    await expect(cab).toContainText('Clínica Mente Sã');
    await expect(cab).not.toContainText('Tel');
    await expect(cab).not.toContainText('E-mail');
    await expect(cab).not.toContainText('undefined');
    await expect(cab).not.toContainText('—');
  });

  test('6a. PSICOLOGO sem CRP: emissão bloqueada com aviso', async ({ page }) => {
    const { crp: _c, ...semCrp } = PSICOLOGO;
    await abrir(page, semCrp);
    await expect(page.getByText('preencha seu CRP no perfil', { exact: false })).toBeVisible();
    await expect(page.getByTestId('corpo-clinico')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /imprimir/i })).toHaveCount(0);
  });

  test('6a2. CRP só com espaços também bloqueia (presença, sem validar formato)', async ({ page }) => {
    await abrir(page, { ...PSICOLOGO, crp: '   ' });
    await expect(page.getByText('preencha seu CRP no perfil', { exact: false })).toBeVisible();
  });

  test('6a3. CRP em qualquer formato não vazio NÃO bloqueia (sem regex)', async ({ page }) => {
    await abrir(page, { ...PSICOLOGO, crp: 'qualquer-coisa-123' });
    await expect(page.getByTestId('corpo-clinico')).toBeVisible();
    await expect(page.getByTestId('assinatura')).toContainText('CRP qualquer-coisa-123');
  });

  test('6b. SECRETARIA sem CRP NÃO é bloqueada', async ({ page }) => {
    await abrir(page, SECRETARIA);
    await expect(page.getByTestId('corpo-clinico')).toBeVisible();
    await expect(page.getByText('preencha seu CRP no perfil', { exact: false })).toHaveCount(0);
    await expect(page.getByTestId('assinatura')).not.toContainText('CRP');
  });
});
