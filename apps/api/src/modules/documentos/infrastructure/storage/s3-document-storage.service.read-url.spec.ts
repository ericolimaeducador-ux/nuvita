import { S3DocumentStorageService } from './s3-document-storage.service';

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

type CreateReadUrlComFilename = (privateUrl: string, ttl: number, filename?: string) => Promise<string>;

describe('S3DocumentStorageService.createReadUrl — Content-Disposition genérico (NGS1 #1)', () => {
  const privateUrl = 's3://bucket-teste/cli/pacientes/pac/0b9f1c1e-0000-4000-8000-000000000000.pdf';

  it('a URL assinada leva response-content-disposition inline com o filename genérico', async () => {
    const storage = new S3DocumentStorageService(config as never);
    const createReadUrl = storage.createReadUrl.bind(storage) as unknown as CreateReadUrlComFilename;

    const url = new URL(await createReadUrl(privateUrl, 300, 'documento-2026-09-30.pdf'));

    expect(url.searchParams.get('response-content-disposition')).toBe(
      'inline; filename="documento-2026-09-30.pdf"',
    );
  });

  it('sanitiza o filename: aspas e quebras de linha não escapam do header', async () => {
    const storage = new S3DocumentStorageService(config as never);
    const createReadUrl = storage.createReadUrl.bind(storage) as unknown as CreateReadUrlComFilename;

    const url = new URL(await createReadUrl(privateUrl, 300, 'a"b\r\nc.pdf'));

    const disposition = url.searchParams.get('response-content-disposition') ?? '';
    expect(disposition).toMatch(/^inline; filename="[^"\r\n]*"$/);
  });
});
