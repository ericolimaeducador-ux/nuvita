import { test, expect, type Page } from '@playwright/test';

// Página INTEIRA do atestado (rota real, fluxo "Gerar atestado"), não só o DocumentoTimbre.
// Sessão e API simuladas; nada vai ao backend.

const PSICOLOGO = { id: 'u1', nome: 'Dra. Ana Souza', email: 'ana@mentesa.example', papel: 'PSICOLOGO', clinicaId: 'c1', crp: '06/12345' };

const CLINICA_CNPJ = {
  nome: 'Clínica Mente Sã',
  documento: '12345678000195',
  tipoDocumento: 'CNPJ',
  endereco: { logradouro: 'Rua das Acácias', numero: '120', cidade: 'Belo Horizonte', estado: 'MG' },
  telefone: '(31) 3333-4444',
  emailContato: 'contato@mentesa.example',
};

async function abrirAtestado(page: Page, clinica: Record<string, unknown>) {
  await page.addInitScript((u) => {
    localStorage.setItem('nuvita.accessToken', 'token-de-teste');
    localStorage.setItem('nuvita.user', JSON.stringify(u));
  }, PSICOLOGO);
  await page.route('**/clinicas/minha', (route) => route.fulfill({ json: clinica }));
  await page.route('**/pacientes/p1', (route) => route.fulfill({ json: { id: 'p1', nome: 'Paciente Fictício' } }));
  await page.route('**/prontuarios**', (route) => route.fulfill({ json: [] }));
  await page.goto('/pagina.html');
  await page.getByRole('button', { name: /gerar atestado/i }).click();
}

test.describe('atestado — página inteira', () => {
  test('1. compõe o documento completo: timbre, corpo, assinatura e rodapé', async ({ page }) => {
    await abrirAtestado(page, CLINICA_CNPJ);
    const doc = page.locator('.documento-clinico-print');
    await expect(doc.locator('header')).toContainText('Clínica Mente Sã');
    await expect(doc).toContainText('Atestado de Comparecimento');
    await expect(doc).toContainText('Paciente Fictício');
    await expect(page.getByTestId('assinatura')).toContainText('Dra. Ana Souza — CRP 06/12345');
    await expect(doc.locator('footer')).toContainText('Clínica Mente Sã');
  });

  test('2. CNPJ sai com máscara 00.000.000/0000-00 no cabeçalho e no rodapé', async ({ page }) => {
    await abrirAtestado(page, CLINICA_CNPJ);
    const doc = page.locator('.documento-clinico-print');
    await expect(doc.locator('header')).toContainText('CNPJ: 12.345.678/0001-95');
    await expect(doc.locator('footer')).toContainText('CNPJ: 12.345.678/0001-95');
    await expect(doc).not.toContainText('12345678000195');
  });

  test('3. CPF sai com máscara 000.000.000-00 e rótulo CPF', async ({ page }) => {
    await abrirAtestado(page, { ...CLINICA_CNPJ, documento: '03294572689', tipoDocumento: 'CPF' });
    const doc = page.locator('.documento-clinico-print');
    await expect(doc.locator('header')).toContainText('CPF: 032.945.726-89');
    await expect(doc).not.toContainText('03294572689');
    await expect(doc).not.toContainText('CNPJ');
  });

  test('4. dado incoerente (tipo CNPJ com 11 dígitos) não rotula CNPJ: o rótulo segue o que o número é', async ({ page }) => {
    await abrirAtestado(page, { ...CLINICA_CNPJ, documento: '03294572689', tipoDocumento: 'CNPJ' });
    const doc = page.locator('.documento-clinico-print');
    await expect(doc.locator('header')).toContainText('CPF: 032.945.726-89');
    await expect(doc).not.toContainText('CNPJ');
  });
});
