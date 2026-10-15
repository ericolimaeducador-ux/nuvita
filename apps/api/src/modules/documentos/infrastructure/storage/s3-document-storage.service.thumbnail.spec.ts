import { Readable } from 'stream';
import { TipoDocumento } from '../../domain/documento.entity';
import { S3DocumentStorageService } from './s3-document-storage.service';

// SEM jest.mock('sharp'): o objetivo é provar o import real. O build compilado (CommonJS, sem
// esModuleInterop) emitia `sharp_1.default(...)`, que não existe no sharp → TypeError em todo JPEG/PNG.
const config = {
  getConfig: () => ({
    documentStorageBucket: 'bucket-teste',
    documentStorageRegion: 'auto',
    documentStorageEndpoint: 'https://r2.test',
    documentStorageForcePathStyle: true,
    documentStorageAccessKeyId: 'AKIATESTE',
    documentStorageSecretAccessKey: 'segredo-de-teste',
  }),
};

// PNG 1×1 válido.
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const documento = (mimeType: string, ext: string) => ({
  id: 'doc-1',
  clinicaId: 'cli',
  pacienteId: 'pac',
  nome: 'Imagem',
  tipo: TipoDocumento.LAUDO,
  mimeType,
  tamanho: PNG_1X1.length,
  hash: 'ab'.repeat(32),
  uploadPor: 'u1',
  criadoEm: new Date('2026-10-15T12:00:00.000Z'),
  url: `s3://bucket-teste/cli/pacientes/pac/0b9f1c1e-0000-4000-8000-000000000000.${ext}`,
});

type Comando = { constructor: { name: string }; input: Record<string, unknown> };

function makeStorage() {
  const storage = new S3DocumentStorageService(config as never);
  const send = jest.fn(async (command: Comando) =>
    command.constructor.name === 'GetObjectCommand' ? { Body: Readable.from([PNG_1X1]) } : {},
  );
  (storage as unknown as { client: { send: typeof send } }).client = { send };
  return { storage, send };
}

describe('S3DocumentStorageService.createThumbnailIfSupported — sharp real', () => {
  it('PNG: gera a miniatura .thumb.jpg e grava no storage como image/jpeg', async () => {
    const { storage, send } = makeStorage();
    const doc = documento('image/png', 'png');

    const url = await storage.createThumbnailIfSupported(doc as never);

    expect(url).toBe(`${doc.url}.thumb.jpg`);
    const put = send.mock.calls.map(([c]) => c).find((c) => c.constructor.name === 'PutObjectCommand');
    expect(put).toBeDefined();
    expect(put!.input).toMatchObject({ Bucket: 'bucket-teste', ContentType: 'image/jpeg' });
    expect(String(put!.input.Key)).toMatch(/\.png\.thumb\.jpg$/);
    expect(Buffer.isBuffer(put!.input.Body)).toBe(true);
  });

  it('PDF: não gera miniatura e não toca no storage', async () => {
    const { storage, send } = makeStorage();

    const url = await storage.createThumbnailIfSupported(documento('application/pdf', 'pdf') as never);

    expect(url).toBeUndefined();
    expect(send).not.toHaveBeenCalled();
  });
});
