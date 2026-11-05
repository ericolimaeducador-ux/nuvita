import { createHash } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';

// Verificação da UI de logo da clínica NO COMPONENTE RENDERIZADO (ClinicaPage real do ADMIN e o
// cartão do SUPER_ADMIN). A API e o R2 são simulados aqui; nada vai ao backend.

const CLINICA = {
  nome: 'Clínica Mente Sã',
  documento: '12.345.678/0001-95',
  tipoDocumento: 'CNPJ',
};
const LOGO_URL = 'https://cdn.example/clinica-logo.png';
const ADMIN = { id: 'u1', nome: 'Admin Mente Sã', email: 'adm@mentesa.example', papel: 'ADMIN', clinicaId: 'cli-A' };

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const MB = 1024 * 1024;

type Evento = string;

/** Simula sessão, /clinicas/minha (com estado), as 3 rotas da logo e o PUT no R2. */
async function preparar(
  page: Page,
  opts: { comLogo?: boolean; upload?: { status: number; message?: string }; put?: { status: number } } = {},
) {
  const eventos: Evento[] = [];
  const puts: { headers: Record<string, string>; body: Buffer | null }[] = [];
  const estado = { logoUrl: opts.comLogo ? LOGO_URL : undefined as string | undefined };

  await page.addInitScript((u) => {
    localStorage.setItem('nuvita.accessToken', 'token-de-teste');
    localStorage.setItem('nuvita.user', JSON.stringify(u));
  }, ADMIN);

  await page.route('**/clinicas/minha', (route) => {
    eventos.push('minha');
    return route.fulfill({ json: { ...CLINICA, ...(estado.logoUrl ? { logoUrl: estado.logoUrl } : {}) } });
  });
  await page.route('**/clinicas/*/logo/upload-url', (route) => {
    eventos.push('upload-url');
    const corpo = route.request().postDataJSON();
    eventos.push(`upload-url:${route.request().url().split('/clinicas/')[1].split('/')[0]}:${JSON.stringify(corpo)}`);
    if (opts.upload && opts.upload.status !== 200) {
      return route.fulfill({ status: opts.upload.status, json: { message: opts.upload.message ?? 'erro' } });
    }
    return route.fulfill({
      json: { uploadUrl: 'https://r2.test/put/logos/cli-A/novo.png?X-Amz-Signature=x', logoKey: 'logos/cli-A/novo.png', expiresInSeconds: 900 },
    });
  });
  await page.route('https://r2.test/**', (route) => {
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'PUT, OPTIONS',
      'access-control-allow-headers': '*',
    };
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    eventos.push('put');
    puts.push({ headers: req.headers(), body: req.postDataBuffer() });
    return route.fulfill({ status: opts.put?.status ?? 200, headers: cors, body: '' });
  });
  await page.route('**/clinicas/*/logo/confirmar', (route) => {
    eventos.push('confirmar');
    eventos.push(`confirmar:${JSON.stringify(route.request().postDataJSON())}`);
    estado.logoUrl = LOGO_URL;
    return route.fulfill({ status: 204 });
  });
  await page.route('**/clinicas/*/logo', (route) => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    eventos.push('delete');
    estado.logoUrl = undefined;
    return route.fulfill({ status: 204 });
  });
  await page.route('https://cdn.example/**', (route) => route.fulfill({ contentType: 'image/png', body: PNG_1x1 }));

  return { eventos, puts, estado };
}

const arquivo = (name: string, mimeType: string, buffer: Buffer) => ({ name, mimeType, buffer });

test.describe('logo da clínica (ADMIN, ClinicaPage)', () => {
  test('1a. sem logo: estado "adicionar logo" e aviso do cabeçalho textual', async ({ page }) => {
    await preparar(page);
    await page.goto('/logo.html');
    await expect(page.getByTestId('logo-vazio')).toBeVisible();
    await expect(page.getByTestId('logo-vazio')).toContainText('cabeçalho');
    await expect(page.getByRole('button', { name: /adicionar logo/i })).toBeVisible();
    await expect(page.getByTestId('logo-atual')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /remover/i })).toHaveCount(0);
  });

  test('1b. com logo: preview da logo atual e botões Trocar / Remover', async ({ page }) => {
    await preparar(page, { comLogo: true });
    await page.goto('/logo.html');
    await expect(page.getByTestId('logo-atual')).toHaveAttribute('src', LOGO_URL);
    await expect(page.getByRole('button', { name: /trocar logo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /remover logo/i })).toBeVisible();
    await expect(page.getByTestId('logo-vazio')).toHaveCount(0);
  });

  test('2a. arquivo que não é PNG/JPG: erro no cliente, sem chamar upload-url', async ({ page }) => {
    const { eventos } = await preparar(page);
    await page.goto('/logo.html');
    for (const [nome, tipo] of [['logo.svg', 'image/svg+xml'], ['logo.gif', 'image/gif'], ['logo.pdf', 'application/pdf']]) {
      await page.getByTestId('logo-input').setInputFiles(arquivo(nome, tipo, Buffer.from('x')));
      await expect(page.getByTestId('logo-erro')).toContainText('PNG ou JPG');
    }
    expect(eventos.filter((e) => e.startsWith('upload-url'))).toEqual([]);
    await expect(page.getByTestId('logo-preview-selecionado')).toHaveCount(0);
  });

  test('2b. arquivo acima de 2 MB: erro no cliente, sem chamar upload-url; 2 MB exatos passam', async ({ page }) => {
    const { eventos } = await preparar(page);
    await page.goto('/logo.html');
    await page.getByTestId('logo-input').setInputFiles(arquivo('grande.png', 'image/png', Buffer.alloc(2 * MB + 1)));
    await expect(page.getByTestId('logo-erro')).toContainText('2 MB');
    expect(eventos.filter((e) => e.startsWith('upload-url'))).toEqual([]);

    await page.getByTestId('logo-input').setInputFiles(arquivo('limite.png', 'image/png', Buffer.alloc(2 * MB)));
    await expect(page.getByTestId('logo-erro')).toHaveCount(0);
    await expect(page.getByTestId('logo-preview-selecionado')).toBeVisible();
  });

  test('3. upload feliz: preview do arquivo, depois upload-url → PUT → confirmar, nessa ordem, e o preview vira a logo', async ({ page }) => {
    const { eventos } = await preparar(page);
    await page.goto('/logo.html');

    await page.getByTestId('logo-input').setInputFiles(arquivo('minha-logo.png', 'image/png', PNG_1x1));
    await expect(page.getByTestId('logo-preview-selecionado')).toHaveAttribute('src', /^blob:/);
    expect(eventos.filter((e) => e === 'upload-url')).toEqual([]); // só sobe depois de salvar

    await page.getByRole('button', { name: /salvar logo/i }).click();
    await expect(page.getByTestId('logo-atual')).toHaveAttribute('src', LOGO_URL);

    const ordem = eventos.filter((e) => ['upload-url', 'put', 'confirmar'].includes(e));
    expect(ordem).toEqual(['upload-url', 'put', 'confirmar']);
    expect(eventos.lastIndexOf('minha')).toBeGreaterThan(eventos.indexOf('confirmar')); // rebuscou /clinicas/minha
    expect(eventos.find((e) => e.startsWith('confirmar:'))).toBe('confirmar:{"logoKey":"logos/cli-A/novo.png"}');
    expect(eventos.find((e) => e.startsWith('upload-url:'))).toContain('upload-url:cli-A:'); // clínica do token do ADMIN
    await expect(page.getByTestId('logo-preview-selecionado')).toHaveCount(0);
  });

  test('3b. trocar: mesmo fluxo com logo já existente', async ({ page }) => {
    const { eventos } = await preparar(page, { comLogo: true });
    await page.goto('/logo.html');
    await expect(page.getByTestId('logo-atual')).toBeVisible();

    await page.getByTestId('logo-input').setInputFiles(arquivo('nova.jpg', 'image/jpeg', PNG_1x1));
    await page.getByRole('button', { name: /salvar logo/i }).click();

    await expect.poll(() => eventos.includes('confirmar')).toBe(true);
    expect(eventos.filter((e) => ['upload-url', 'put', 'confirmar'].includes(e))).toEqual(['upload-url', 'put', 'confirmar']);
  });

  test('4. remover: chama DELETE e volta ao estado sem logo', async ({ page }) => {
    const { eventos } = await preparar(page, { comLogo: true });
    await page.goto('/logo.html');

    await page.getByRole('button', { name: /remover logo/i }).click();

    await expect(page.getByTestId('logo-vazio')).toBeVisible();
    await expect(page.getByTestId('logo-atual')).toHaveCount(0);
    expect(eventos).toContain('delete');
  });

  test('5. o SHA-256 do arquivo é calculado e enviado no PUT, com o Content-Type do arquivo', async ({ page }) => {
    const { puts, eventos } = await preparar(page);
    await page.goto('/logo.html');
    const esperado = createHash('sha256').update(PNG_1x1).digest('hex');

    await page.getByTestId('logo-input').setInputFiles(arquivo('minha-logo.png', 'image/png', PNG_1x1));
    await page.getByRole('button', { name: /salvar logo/i }).click();
    await expect.poll(() => eventos.includes('confirmar')).toBe(true);

    expect(puts).toHaveLength(1);
    expect(puts[0].headers['x-amz-meta-sha256']).toBe(esperado);
    expect(puts[0].headers['content-type']).toBe('image/png');
    expect(puts[0].body?.equals(PNG_1x1)).toBe(true);
    // o mesmo hash vai no pedido do upload-url
    expect(eventos.find((e) => e.startsWith('upload-url:'))).toContain(esperado);
    expect(eventos.find((e) => e.startsWith('upload-url:'))).toContain('"tamanho":' + PNG_1x1.length);
    // o PUT no R2 não leva o token da API
    expect(puts[0].headers['authorization']).toBeUndefined();
  });

  test('6a. servidor recusa (422): mostra a mensagem clara, sem erro cru e sem PUT', async ({ page }) => {
    const { eventos } = await preparar(page, { upload: { status: 422, message: 'A logo deve ser PNG ou JPG.' } });
    await page.goto('/logo.html');

    await page.getByTestId('logo-input').setInputFiles(arquivo('minha-logo.png', 'image/png', PNG_1x1));
    await page.getByRole('button', { name: /salvar logo/i }).click();

    await expect(page.getByTestId('logo-erro')).toContainText('A logo deve ser PNG ou JPG.');
    expect(eventos).not.toContain('put');
    await expect(page.getByTestId('logo-erro')).not.toContainText('status code');
  });

  test('6b. falha no R2 (PUT 403): mensagem clara e a logo não é confirmada', async ({ page }) => {
    const { eventos } = await preparar(page, { put: { status: 403 } });
    await page.goto('/logo.html');

    await page.getByTestId('logo-input').setInputFiles(arquivo('minha-logo.png', 'image/png', PNG_1x1));
    await page.getByRole('button', { name: /salvar logo/i }).click();

    await expect(page.getByTestId('logo-erro')).toContainText('Não foi possível enviar a logo');
    expect(eventos).not.toContain('confirmar');
  });
});

test.describe('logo da clínica (SUPER_ADMIN, por clínica)', () => {
  test('7. o cartão do SUPER_ADMIN sobe e remove a logo da clínica escolhida (por id)', async ({ page }) => {
    const { eventos } = await preparar(page);
    await page.goto('/logo.html?modo=super&clinica=cli-B');

    await page.getByTestId('logo-input').setInputFiles(arquivo('minha-logo.png', 'image/png', PNG_1x1));
    await page.getByRole('button', { name: /salvar logo/i }).click();
    await expect(page.getByTestId('logo-status')).toContainText('Logo atualizada');
    expect(eventos.find((e) => e.startsWith('upload-url:'))).toContain('upload-url:cli-B:');

    await page.getByRole('button', { name: /remover logo/i }).click();
    await expect(page.getByTestId('logo-status')).toContainText('Logo removida');
    expect(eventos).toContain('delete');
  });
});
