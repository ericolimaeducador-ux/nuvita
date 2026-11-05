import { test, expect, type Page } from '@playwright/test';

// (1) Diálogos acionados pela barra de uma Secao recolhida precisam abrir sem expandir a seção e
//     sobreviver a ela recolher. (2) "Solicitar correção" não perde a justificativa ao clicar fora.
// API simulada pelo Playwright.

const ADMIN = { id: 'u1', nome: 'Admin', email: 'adm@clinica.example', papel: 'ADMIN', clinicaId: 'cli-1' };
const ENFERMEIRO = { id: 'u2', nome: 'Psi', email: 'psi@clinica.example', papel: 'ENFERMEIRO', clinicaId: 'cli-1' };
const PACIENTE = {
  id: 'p1', nome: 'Maria da Silva', cpf: '52998224725', dataNascimento: '1990-01-01T00:00:00.000Z',
  sexo: 'F', telefone: '11999990000', email: 'maria@example.com', ativo: true,
};

async function abrirPaciente(page: Page, user: unknown) {
  await page.addInitScript((u) => {
    localStorage.setItem('nuvita.accessToken', 'token-de-teste');
    localStorage.setItem('nuvita.user', JSON.stringify(u));
  }, user);
  await page.route('**/*', (r) => {
    const t = r.request().resourceType();
    return t === 'fetch' || t === 'xhr' ? r.fulfill({ json: { items: [], total: 0 } }) : r.fallback();
  });
  await page.route('**/observacoes-paciente**', (r) => r.fulfill({ json: [] })); // array puro
  await page.route('**/pacientes/p1', (r) => r.fulfill({ json: PACIENTE }));
  await page.goto('/paciente.html');
  await expect(page.getByText('Dados cadastrais')).toBeVisible();
}

test.describe('Dialog de Secao recolhida (Aplicar teste)', () => {
  test('clicar em "Aplicar teste" com a seção recolhida abre o dialog', async ({ page }) => {
    await abrirPaciente(page, ENFERMEIRO);
    await page.getByRole('button', { name: 'Aplicar teste' }).click();
    await expect(page.getByRole('dialog')).toContainText('Aplicar teste psicológico');
  });

  test('recolher a seção com o dialog aberto não o desmonta nem perde o texto', async ({ page }) => {
    await abrirPaciente(page, ENFERMEIRO);
    await page.getByText('Testes Psicológicos').click(); // expande
    await page.getByRole('button', { name: 'Aplicar teste' }).click();
    await page.getByLabel('Resultado (opcional)').fill('escore parcial');
    // recolhe a seção pelo cabeçalho (o overlay do dialog cobre a tela, então via DOM)
    await page.getByText('Testes Psicológicos').first().dispatchEvent('click');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('Resultado (opcional)')).toHaveValue('escore parcial');
  });
});

test.describe('Solicitar correção de dados', () => {
  async function abrirSolicitar(page: Page) {
    await abrirPaciente(page, ADMIN);
    await page.getByTitle('Editar cadastro').click();
    await page.getByRole('button', { name: 'Solicitar correção' }).click();
    await expect(page.getByRole('dialog')).toContainText('Solicitar correção de dados');
  }

  test('clique fora e ESC não fecham e a justificativa é preservada', async ({ page }) => {
    await abrirSolicitar(page);
    await page.getByLabel('Justificativa').fill('CPF digitado errado, o correto é 111.444.777-35');
    await page.mouse.click(5, 5);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('Justificativa')).toHaveValue('CPF digitado errado, o correto é 111.444.777-35');
  });

  test('Cancelar com texto pede confirmação; sem texto fecha direto', async ({ page }) => {
    await abrirSolicitar(page);
    await page.getByLabel('Justificativa').fill('texto importante');
    const mensagens: string[] = [];
    page.once('dialog', (d) => { mensagens.push(d.message()); void d.dismiss(); });
    await page.getByRole('button', { name: 'Cancelar' }).click();
    expect(mensagens).toEqual(['Descartar alterações?']);
    await expect(page.getByLabel('Justificativa')).toHaveValue('texto importante');

    page.once('dialog', (d) => void d.accept());
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('Cancelar sem texto fecha direto, sem confirmação', async ({ page }) => {
    await abrirSolicitar(page);
    let perguntou = false;
    page.on('dialog', (d) => { perguntou = true; void d.dismiss(); });
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(perguntou).toBe(false);
  });
});
