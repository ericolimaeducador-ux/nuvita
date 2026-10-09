import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { S3DocumentStorageService } from '../infrastructure/storage/s3-document-storage.service';
import { TipoDocumento } from '../domain/documento.entity';
import { DocumentosService } from './documentos.service';

// Passa a chamada adiante (URL realmente assinada) e deixa inspecionar o comando.
jest.mock('@aws-sdk/s3-request-presigner', () => {
  const actual = jest.requireActual('@aws-sdk/s3-request-presigner');
  return { ...actual, getSignedUrl: jest.fn(actual.getSignedUrl) };
});

// O sharp não é o alvo deste spec (só as Keys): mockado para não depender do interop de default import do ts-jest.
jest.mock('sharp', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    resize: () => ({ jpeg: () => ({ toBuffer: async () => Buffer.from('thumb') }) }),
  })),
}));

const assinar = getSignedUrl as unknown as jest.Mock;

const BUCKET = 'bucket-teste';
const CLINICA_ID = '64b000000000000000000001';
const PACIENTE_ID = '64b000000000000000000002';
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const CRIADO_EM = new Date('2026-09-30T15:00:00.000Z');

// Formato ANTIGO da chave (antes do NGS1 #1): "<uuid>-<nome do paciente>-<titulo>.<ext>".
const CHAVE_ANTIGA = `${CLINICA_ID}/pacientes/${PACIENTE_ID}/0b9f1c1e-0000-4000-8000-000000000000-Joao_da_Silva-Laudo_Joao_da_Silva`;

const config = {
  getConfig: () => ({
    documentStorageBucket: BUCKET,
    documentStorageRegion: 'auto',
    documentStorageEndpoint: 'https://r2.test',
    documentStorageForcePathStyle: true,
    documentStorageAccessKeyId: 'AKIATESTE',
    documentStorageSecretAccessKey: 'segredo-de-teste',
  }),
};

const ctx = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: { sub: 'user-1', email: 'secretaria@clinica.test', papel: Papel.SECRETARIA, clinicaId: CLINICA_ID, jti: 'j1', typ: 'access' as const },
};

function documentoAntigo(extensao: '.pdf' | '.png', mimeType: 'application/pdf' | 'image/png') {
  return {
    id: 'doc-antigo',
    clinicaId: CLINICA_ID,
    pacienteId: PACIENTE_ID,
    nome: 'Laudo Joao da Silva',
    tipo: TipoDocumento.LAUDO,
    mimeType,
    tamanho: 1024,
    url: `s3://${BUCKET}/${CHAVE_ANTIGA}${extensao}`,
    hash: 'a'.repeat(64),
    uploadPor: 'user-1',
    criadoEm: CRIADO_EM,
    confirmadoEm: CRIADO_EM,
  };
}

function montar(documento?: ReturnType<typeof documentoAntigo>) {
  const documentos = {
    sumActivePatientBytes: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockImplementation(async (input: Record<string, unknown>) => ({ id: 'doc-novo', criadoEm: CRIADO_EM, ...input })),
    findById: jest.fn().mockResolvedValue(documento),
  };
  const storage = new S3DocumentStorageService(config as never);
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
  const service = new DocumentosService(documentos as never, storage as never, auditLogs as never, {} as never, {} as never);
  return { service, storage, documentos };
}

describe('Compatibilidade com documentos gravados com a chave ANTIGA (nome de paciente na chave)', () => {
  let send: jest.SpyInstance;
  let comandos: unknown[];

  beforeEach(() => {
    assinar.mockClear();
    comandos = [];
    const imagem = Buffer.from('imagem-fake');
    send = jest.spyOn(S3Client.prototype, 'send').mockImplementation((async (comando: unknown) => {
      comandos.push(comando);
      return comando instanceof GetObjectCommand ? { Body: Readable.from([imagem]) } : {};
    }) as never);
  });

  afterEach(() => {
    send.mockRestore();
  });

  it('download: createAccessUrl assina o GetObjectCommand com a Key ANTIGA exata, vinda do banco', async () => {
    const doc = documentoAntigo('.pdf', 'application/pdf');
    const { service } = montar(doc);

    const { accessUrl } = await service.createAccessUrl(doc.id, CLINICA_ID, ctx);

    expect(assinar).toHaveBeenCalledTimes(1);
    const comando = assinar.mock.calls[0][1] as GetObjectCommand;
    expect(comando).toBeInstanceOf(GetObjectCommand);
    expect(comando.input.Bucket).toBe(BUCKET);
    expect(comando.input.Key).toBe(`${CHAVE_ANTIGA}.pdf`);

    // A URL realmente assinada aponta para o objeto antigo (path-style: /bucket/key).
    const url = new URL(accessUrl);
    expect(decodeURIComponent(url.pathname)).toBe(`/${BUCKET}/${CHAVE_ANTIGA}.pdf`);
    expect(url.searchParams.get('X-Amz-Signature')).toBeTruthy();
  });

  it('download de documento antigo: o nome sugerido ao baixar é genérico, sem o nome do paciente', async () => {
    const doc = documentoAntigo('.pdf', 'application/pdf');
    const { service } = montar(doc);

    const { accessUrl } = await service.createAccessUrl(doc.id, CLINICA_ID, ctx);

    const disposicao = new URL(accessUrl).searchParams.get('response-content-disposition') ?? '';
    expect(disposicao).toBe('inline; filename="documento-2026-09-30.pdf"');
    expect(disposicao).not.toMatch(/joao|silva|laudo/i);
  });

  it('thumbnail: o GetObject usa a Key antiga e o thumbnail derivado vai para "<chave antiga>.thumb.jpg"', async () => {
    const doc = documentoAntigo('.png', 'image/png');
    const { storage } = montar(doc);

    const privateUrl = await storage.createThumbnailIfSupported(doc as never);

    const get = comandos.find((c) => c instanceof GetObjectCommand) as GetObjectCommand;
    const put = comandos.find((c) => c instanceof PutObjectCommand) as PutObjectCommand;
    expect(get.input.Key).toBe(`${CHAVE_ANTIGA}.png`);
    expect(put.input.Key).toBe(`${CHAVE_ANTIGA}.png.thumb.jpg`);
    expect(privateUrl).toBe(`s3://${BUCKET}/${CHAVE_ANTIGA}.png.thumb.jpg`);
  });

  it('exclusão: apaga o objeto antigo e o thumbnail derivado pela Key antiga exata', async () => {
    const doc = documentoAntigo('.pdf', 'application/pdf');
    const { storage } = montar(doc);

    await storage.deleteObject(doc.url);

    const chaves = comandos
      .filter((c): c is DeleteObjectCommand => c instanceof DeleteObjectCommand)
      .map((c) => c.input.Key)
      .sort();
    expect(chaves).toEqual([`${CHAVE_ANTIGA}.pdf`, `${CHAVE_ANTIGA}.pdf.thumb.jpg`].sort());
  });
});

describe('Chave de objetos NOVOS: sem dado pessoal do paciente', () => {
  it('a Key do PutObjectCommand não contém nome, CPF, e-mail nem telefone e segue o formato <clinica>/pacientes/<id>/<uuid><ext>', async () => {
    assinar.mockClear();
    const paciente = { nome: 'Maria Souza Lima', cpf: '123.456.789-09', email: 'maria.souza@exemplo.test', telefone: '11999998888' };
    const { service } = montar();

    const resposta = await service.createUploadUrl(
      {
        clinicaId: CLINICA_ID,
        pacienteId: PACIENTE_ID,
        nome: `Exame de ${paciente.nome}`,
        nomePaciente: paciente.nome,
        tipo: TipoDocumento.LAUDO,
        mimeType: 'application/pdf',
        tamanho: 2048,
        hash: 'b'.repeat(64),
      } as never,
      ctx,
    );

    expect(assinar).toHaveBeenCalledTimes(1);
    const comando = assinar.mock.calls[0][1] as PutObjectCommand;
    expect(comando).toBeInstanceOf(PutObjectCommand);
    const key = comando.input.Key as string;

    expect(key).toMatch(new RegExp(`^${CLINICA_ID}/pacientes/${PACIENTE_ID}/${UUID}\\.pdf$`));

    const minuscula = key.toLowerCase();
    const digitos = key.replace(/\D/g, '');
    for (const [campo, valor] of Object.entries(paciente)) {
      expect({ campo, aparece: minuscula.includes(valor.toLowerCase()) }).toEqual({ campo, aparece: false });
    }
    for (const parte of ['maria', 'souza', 'lima', 'exame']) {
      expect(minuscula.replace(CLINICA_ID, '').replace(PACIENTE_ID, '')).not.toContain(parte);
    }
    expect(digitos).not.toContain('12345678909');
    expect(digitos).not.toContain('11999998888');

    // A URL de upload realmente assinada aponta para essa mesma chave, e o privateUrl guardado também.
    expect(decodeURIComponent(new URL(resposta.uploadUrl).pathname)).toBe(`/${BUCKET}/${key}`);
    expect(resposta.documento.url).toBe(`s3://${BUCKET}/${key}`);
  });
});
