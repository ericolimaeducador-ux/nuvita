import { createServer, IncomingHttpHeaders, Server } from 'http';
import { AddressInfo } from 'net';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client } from '@aws-sdk/client-s3';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { S3DocumentStorageService } from '../infrastructure/storage/s3-document-storage.service';
import { TipoDocumento } from '../domain/documento.entity';
import { DocumentosService } from './documentos.service';

// Passa a chamada adiante (URL realmente assinada) e deixa inspecionar os parâmetros exatos.
jest.mock('@aws-sdk/s3-request-presigner', () => {
  const actual = jest.requireActual('@aws-sdk/s3-request-presigner');
  return { ...actual, getSignedUrl: jest.fn(actual.getSignedUrl) };
});
const assinar = getSignedUrl as unknown as jest.Mock;

/**
 * Contrato do upload direto ao R2 (presign-upload → PUT do navegador).
 *
 * Regra do R2 verificada em produção (GET presignado de chave inexistente):
 *   header `x-amz-*` na requisição que NÃO esteja em X-Amz-SignedHeaders → 403 SignatureDoesNotMatch;
 *   header não-`x-amz-*` não assinado (ex.: Content-Type) → aceito.
 *
 * O servidor abaixo é um R2 SIMULADO que aplica só essa regra (não recalcula o HMAC). As URLs
 * são geradas pelo código REAL (S3DocumentStorageService / DocumentosService) e o PUT é feito
 * com o `fetch` real do Node; o servidor captura exatamente os headers recebidos.
 */
interface Recebido { metodo?: string; url: string; headers: IncomingHttpHeaders; bytes: number }

let servidor: Server;
let porta: number;
let recebidos: Recebido[];

function assinados(url: URL): Set<string> {
  return new Set((url.searchParams.get('X-Amz-SignedHeaders') ?? '').split(';').filter(Boolean));
}

beforeAll(async () => {
  servidor = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${porta}`);
      recebidos.push({ metodo: req.method, url: req.url ?? '', headers: req.headers, bytes: Buffer.concat(chunks).length });
      const naoAssinados = Object.keys(req.headers).filter((h) => h.startsWith('x-amz-') && !assinados(url).has(h));
      if (naoAssinados.length > 0) {
        res.writeHead(403, { 'Content-Type': 'application/xml' });
        res.end(`<Error><Code>SignatureDoesNotMatch</Code><Message>headers not signed: ${naoAssinados.join(',')}</Message></Error>`);
        return;
      }
      res.writeHead(200);
      res.end();
    });
  });
  await new Promise<void>((ok) => servidor.listen(0, '127.0.0.1', ok));
  porta = (servidor.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise<void>((ok) => servidor.close(() => ok()));
});

beforeEach(() => {
  recebidos = [];
  assinar.mockClear();
});

const BUCKET = 'bucket-teste';
const CLINICA_ID = '64b000000000000000000001';
const PACIENTE_ID = '64b000000000000000000002';
const HASH = 'ab'.repeat(32);
const TAMANHO = 1024;

const config = () => ({
  getConfig: () => ({
    documentStorageBucket: BUCKET,
    documentStorageRegion: 'auto',
    documentStorageEndpoint: `http://127.0.0.1:${porta}`,
    documentStorageForcePathStyle: true,
    documentStorageAccessKeyId: 'AKIATESTE',
    documentStorageSecretAccessKey: 'segredo-de-teste',
  }),
});

const ctx = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: { sub: 'user-1', email: 'secretaria@clinica.test', papel: Papel.SECRETARIA, clinicaId: CLINICA_ID, jti: 'j1', typ: 'access' as const },
};

function montarServico() {
  const documentos = {
    sumActivePatientBytes: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockImplementation(async (input: Record<string, unknown>) => ({ id: 'doc-1', criadoEm: new Date(), ...input })),
  };
  const storage = new S3DocumentStorageService(config() as never);
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
  return new DocumentosService(documentos as never, storage as never, auditLogs as never, {} as never, {} as never);
}

/** O que o front faz hoje: fetch(uploadUrl, { method: 'PUT', headers: requiredHeaders, body: file }). */
async function putComoOFront(uploadUrl: string, headers: Record<string, string>) {
  return fetch(uploadUrl, { method: 'PUT', headers, body: Buffer.alloc(TAMANHO, 1) });
}

describe('Upload direto ao R2 — regra de headers assinados (R2 simulado)', () => {
  // URL no formato atual do código: Metadata no PutObjectCommand, getSignedUrl só com expiresIn.
  async function urlComMetadataHoisted(): Promise<string> {
    const client = new S3Client({
      region: 'auto',
      endpoint: `http://127.0.0.1:${porta}`,
      forcePathStyle: true,
      credentials: { accessKeyId: 'AKIATESTE', secretAccessKey: 'segredo-de-teste' },
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: `${CLINICA_ID}/pacientes/${PACIENTE_ID}/uuid.pdf`,
      ContentType: 'application/pdf',
      ContentLength: TAMANHO,
      Metadata: { sha256: HASH },
    });
    return getSignedUrl(client, command, { expiresIn: 300 });
  }

  it('a URL tem SignedHeaders=content-length;host e o hash vai como parâmetro da query', async () => {
    const url = new URL(await urlComMetadataHoisted());

    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('content-length;host');
    expect(url.searchParams.get('x-amz-meta-sha256')).toBe(HASH);
  });

  it('PUT com x-amz-meta-sha256 como HEADER (não assinado) é recusado: 403 SignatureDoesNotMatch', async () => {
    const url = await urlComMetadataHoisted();

    const r = await putComoOFront(url, { 'Content-Type': 'application/pdf', 'x-amz-meta-sha256': HASH });

    expect(r.status).toBe(403);
    expect(await r.text()).toContain('SignatureDoesNotMatch');
    expect(recebidos[0].headers['x-amz-meta-sha256']).toBe(HASH);
  });

  it('PUT sem esse header, com o hash só na query da assinatura, é aceito: 200', async () => {
    const url = await urlComMetadataHoisted();

    const r = await putComoOFront(url, { 'Content-Type': 'application/pdf' });

    expect(r.status).toBe(200);
    expect(recebidos).toHaveLength(1);
    expect(Object.keys(recebidos[0].headers).filter((h) => h.startsWith('x-amz-'))).toEqual([]);
    expect(recebidos[0].bytes).toBe(TAMANHO);
  });
});

describe('Contrato presign-upload ↔ PUT do navegador (código real da API)', () => {
  it('os headers que a API manda o front enviar são aceitos pelo R2 com a URL que ela mesma assinou', async () => {
    const service = montarServico();

    const resposta = await service.createUploadUrl(
      {
        clinicaId: CLINICA_ID,
        pacienteId: PACIENTE_ID,
        nome: 'Exame',
        tipo: TipoDocumento.LAUDO,
        mimeType: 'application/pdf',
        tamanho: TAMANHO,
        hash: HASH,
      } as never,
      ctx,
    );

    const r = await putComoOFront(resposta.uploadUrl, resposta.requiredHeaders);

    // Falha enquanto requiredHeaders contiver um x-amz-* que a assinatura não cobre.
    expect(r.status).toBe(200);
    const naoAssinados = Object.keys(recebidos[0].headers).filter((h) => h.startsWith('x-amz-') && !assinados(new URL(resposta.uploadUrl)).has(h));
    expect(naoAssinados).toEqual([]);
    expect(recebidos[0].headers['content-type']).toBe('application/pdf');
  });
});

describe('S3DocumentStorageService.createUploadUrl — headers assinados (fix: x-amz-meta-sha256 como header assinado)', () => {
  const input = { key: `${CLINICA_ID}/pacientes/${PACIENTE_ID}/uuid.pdf`, mimeType: 'application/pdf', tamanho: TAMANHO, hash: HASH };

  it('passa unhoistableHeaders e signableHeaders ao getSignedUrl (parâmetros exatos capturados)', async () => {
    await new S3DocumentStorageService(config() as never).createUploadUrl(input);

    expect(assinar).toHaveBeenCalledTimes(1);
    const opcoes = assinar.mock.calls[0][2] as { expiresIn: number; unhoistableHeaders?: Set<string>; signableHeaders?: Set<string> };
    expect(opcoes.expiresIn).toBeGreaterThan(0);
    expect([...(opcoes.unhoistableHeaders ?? [])]).toEqual(['x-amz-meta-sha256']);
    expect([...(opcoes.signableHeaders ?? [])].sort()).toEqual(['content-type', 'x-amz-meta-sha256']);
  });

  it('SignedHeaders da URL contém content-length, content-type, host e x-amz-meta-sha256', async () => {
    const { uploadUrl } = await new S3DocumentStorageService(config() as never).createUploadUrl(input);

    const signed = (new URL(uploadUrl).searchParams.get('X-Amz-SignedHeaders') ?? '').split(';').sort();
    expect(signed).toEqual(['content-length', 'content-type', 'host', 'x-amz-meta-sha256']);
  });

  it('x-amz-meta-sha256 NÃO está na query string (é header assinado, não parâmetro)', async () => {
    const { uploadUrl } = await new S3DocumentStorageService(config() as never).createUploadUrl(input);

    const chaves = [...new URL(uploadUrl).searchParams.keys()].map((k) => k.toLowerCase());
    expect(chaves).not.toContain('x-amz-meta-sha256');
  });

  it('Content-Type NÃO está na query string', async () => {
    const { uploadUrl } = await new S3DocumentStorageService(config() as never).createUploadUrl(input);

    const chaves = [...new URL(uploadUrl).searchParams.keys()].map((k) => k.toLowerCase());
    expect(chaves).not.toContain('content-type');
  });
});

describe('Documentação do bug: SEM unhoistableHeaders/signableHeaders o hash vai para a query', () => {
  it('getSignedUrl só com expiresIn: SignedHeaders=content-length;host e x-amz-meta-sha256 na query', async () => {
    const client = new S3Client({
      region: 'auto',
      endpoint: `http://127.0.0.1:${porta}`,
      forcePathStyle: true,
      credentials: { accessKeyId: 'AKIATESTE', secretAccessKey: 'segredo-de-teste' },
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
    const command = new PutObjectCommand({ Bucket: BUCKET, Key: 'k/uuid.pdf', ContentType: 'application/pdf', ContentLength: TAMANHO, Metadata: { sha256: HASH } });

    const url = new URL(await getSignedUrl(client, command, { expiresIn: 300 }));

    expect(url.searchParams.get('X-Amz-SignedHeaders')).toBe('content-length;host');
    expect(url.searchParams.get('x-amz-meta-sha256')).toBe(HASH);
  });
});
