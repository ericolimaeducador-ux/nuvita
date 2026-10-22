import { test, expect, type Page } from '@playwright/test';

// Diálogos com texto livre só fecham em Salvar/Cancelar: clique fora e ESC nunca descartam o que foi
// digitado, e Cancelar com texto pede "Descartar alterações?". API simulada pelo Playwright.

const ADMIN = { id: 'u1', nome: 'Admin', email: 'adm@clinica.example', papel: 'ADMIN', clinicaId: 'cli-1' };
const PSICOLOGO = { id: 'u2', nome: 'Psi', email: 'psi@clinica.example', papel: 'PSICOLOGO', clinicaId: 'cli-1' };
const SUPER = { id: 'sa1', nome: 'Erico', email: 'sa@nuvita.test', papel: 'SUPER_ADMIN', clinicaId: null };
const PACIENTE = {
  id: 'p1', nome: 'Maria da Silva', cpf: '52998224725', dataNascimento: '1990-01-01T00:00:00.000Z',
  sexo: 'F', telefone: '11999990000', email: 'maria@example.com', ativo: true,
};

type Envio = { url: string; body: unknown };

async function sessao(page: Page, user: unknown) {
  await page.addInitScript((u) => {
    localStorage.setItem('nuvita.accessToken', 'token-de-teste');
    localStorage.setItem('nuvita.user', JSON.stringify(u));
  }, user);
}

/** Qualquer chamada de API não mockada devolve lista vazia. */
async function apiVazia(page: Page) {
  await page.route('**/*', (r) => {
    const t = r.request().resourceType();
    return t === 'fetch' || t === 'xhr' ? r.fulfill({ json: { items: [], total: 0 } }) : r.fallback();
  });
}

async function abrirPaciente(page: Page, envios: Envio[], user: unknown = ADMIN) {
  await sessao(page, user);
  await apiVazia(page);
  await page.route('**/observacoes-paciente**', (r) => r.fulfill({ json: [] })); // este endpoint devolve array puro
  await page.route('**/pacientes/p1', (r) => {
    if (r.request().method() !== 'GET') envios.push({ url: r.request().url(), body: r.request().postDataJSON() });
    return r.fulfill({ json: PACIENTE });
  });
  await page.route('**/testes-psicologicos', (r) => {
    if (r.request().method() !== 'POST') return r.fallback();
    envios.push({ url: r.request().url(), body: r.request().postDataJSON() });
    return r.fulfill({ status: 201, json: { id: 't1' } });
  });
  await page.goto('/paciente.html');
  await expect(page.getByText('Dados cadastrais')).toBeVisible();
}

/** O que hoje descarta o diálogo sem querer: clique no overlay e ESC. */
async function tentarFecharSemQuerer(page: Page) {
  await page.mouse.click(5, 5);
  await page.keyboard.press('Escape');
}

test.describe('Aplicar teste psicológico (prontuário do paciente)', () => {
  async function abrirTeste(page: Page, envios: Envio[] = []) {
    await abrirPaciente(page, envios, PSICOLOGO);
    await page.getByText('Testes Psicológicos').click(); // expande a seção (o diálogo vive dentro dela)
    await page.getByRole('button', { name: 'Aplicar teste' }).click();
    await expect(page.getByRole('dialog')).toContainText('Aplicar teste psicológico');
  }

  test('clique fora e ESC não fecham e o texto é preservado', async ({ page }) => {
    await abrirTeste(page);
    await page.getByLabel('Nome do teste').fill('BDI-II');
    await page.getByLabel('Resultado (opcional)').fill('Escore 18, depressão leve.');
    await tentarFecharSemQuerer(page);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('Nome do teste')).toHaveValue('BDI-II');
    await expect(page.getByLabel('Resultado (opcional)')).toHaveValue('Escore 18, depressão leve.');
  });

  test('Cancelar com texto pede confirmação; recusar mantém o texto, aceitar descarta', async ({ page }) => {
    await abrirTeste(page);
    await page.getByLabel('Resultado (opcional)').fill('anotação importante');
    const mensagens: string[] = [];
    page.once('dialog', (d) => { mensagens.push(d.message()); void d.dismiss(); });
    await page.getByRole('button', { name: 'Cancelar' }).click();
    expect(mensagens).toEqual(['Descartar alterações?']);
    await expect(page.getByLabel('Resultado (opcional)')).toHaveValue('anotação importante');

    page.once('dialog', (d) => void d.accept());
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('Cancelar sem texto fecha direto, sem confirmação', async ({ page }) => {
    await abrirTeste(page);
    let perguntou = false;
    page.on('dialog', (d) => { perguntou = true; void d.dismiss(); });
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(perguntou).toBe(false);
  });

  test('Registrar teste salva e fecha sem pedir confirmação', async ({ page }) => {
    const envios: Envio[] = [];
    await abrirTeste(page, envios);
    let perguntou = false;
    page.on('dialog', (d) => { perguntou = true; void d.dismiss(); });
    await page.getByLabel('Nome do teste').fill('BAI');
    await page.getByRole('button', { name: 'Registrar teste' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(perguntou).toBe(false);
    expect(envios).toHaveLength(1);
  });
});

test.describe('Editar cadastro do paciente', () => {
  async function abrirEdicao(page: Page) {
    await abrirPaciente(page, []);
    await page.getByTitle('Editar cadastro').click();
    await expect(page.getByRole('dialog')).toContainText('Editar cadastro');
  }

  test('clique fora e ESC não fecham e a edição é preservada', async ({ page }) => {
    await abrirEdicao(page);
    await page.getByLabel('Telefone').fill('11888887777');
    await tentarFecharSemQuerer(page);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByLabel('Telefone')).toHaveValue('11888887777');
  });

  test('Cancelar com edição pede confirmação', async ({ page }) => {
    await abrirEdicao(page);
    await page.getByLabel('Telefone').fill('11888887777');
    const mensagens: string[] = [];
    page.once('dialog', (d) => { mensagens.push(d.message()); void d.dismiss(); });
    await page.getByRole('button', { name: 'Cancelar' }).click();
    expect(mensagens).toEqual(['Descartar alterações?']);
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('Solicitar correção com edição pendente pede confirmação; recusar mantém a edição, aceitar abre a solicitação', async ({ page }) => {
    await abrirEdicao(page);
    await page.getByLabel('Telefone').fill('11888887777');
    const mensagens: string[] = [];
    page.once('dialog', (d) => { mensagens.push(d.message()); void d.dismiss(); });
    await page.getByRole('button', { name: 'Solicitar correção' }).click();
    expect(mensagens).toEqual(['Você tem alterações não salvas. Descartar e continuar?']);
    await expect(page.getByRole('dialog')).toContainText('Editar cadastro');
    await expect(page.getByLabel('Telefone')).toHaveValue('11888887777');

    page.once('dialog', (d) => void d.accept());
    await page.getByRole('button', { name: 'Solicitar correção' }).click();
    await expect(page.getByRole('dialog')).toContainText('Solicitar correção de dados');
  });

  test('Solicitar correção sem edição pendente abre a solicitação direto, sem confirmação', async ({ page }) => {
    await abrirEdicao(page);
    let perguntou = false;
    page.on('dialog', (d) => { perguntou = true; void d.dismiss(); });
    await page.getByRole('button', { name: 'Solicitar correção' }).click();
    await expect(page.getByRole('dialog')).toContainText('Solicitar correção de dados');
    expect(perguntou).toBe(false);
  });
});

test.describe('Nova clínica (super-admin)', () => {
  test('clique fora e ESC não fecham e o texto é preservado', async ({ page }) => {
    await sessao(page, SUPER);
    await apiVazia(page);
    await page.goto('/super.html');
    await page.getByRole('tab', { name: 'Clínicas' }).click();
    await page.getByRole('button', { name: /Nova clínica/ }).click();
    await expect(page.getByRole('dialog')).toContainText('Nova clínica');
    const campo = page.getByRole('dialog').getByRole('textbox').first();
    await campo.fill('Clínica Rascunho');
    await tentarFecharSemQuerer(page);
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(campo).toHaveValue('Clínica Rascunho');
  });
});
