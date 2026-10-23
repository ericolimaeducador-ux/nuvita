import { BadRequestException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { TipoDocumento } from '../domain/documento.entity';
import { DocumentosService } from './documentos.service';

const CLINICA_ID = '64b000000000000000000001';
const PACIENTE_ID = '64b000000000000000000002';
const TITULO = 'Laudo Joao da Silva';
const NOME_PACIENTE = 'Joao da Silva';
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

const ctx = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: { sub: 'user-1', email: 'secretaria@clinica.test', papel: Papel.SECRETARIA, clinicaId: CLINICA_ID, jti: 'j1', typ: 'access' as const },
};

function makeService(criadoEm = new Date('2026-09-30T15:00:00.000Z')) {
  const documentos = {
    sumActivePatientBytes: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockImplementation(async (input: Record<string, unknown>) => ({ id: 'doc-1', criadoEm, ...input })),
    findById: jest.fn().mockResolvedValue({
      id: 'doc-1',
      clinicaId: CLINICA_ID,
      pacienteId: PACIENTE_ID,
      nome: TITULO,
      tipo: TipoDocumento.LAUDO,
      mimeType: 'application/pdf',
      tamanho: 1024,
      url: `s3://bucket/${CLINICA_ID}/pacientes/${PACIENTE_ID}/uuid.pdf`,
      hash: 'a'.repeat(64),
      uploadPor: 'user-1',
      criadoEm,
      confirmadoEm: criadoEm,
    }),
  };
  const storage = {
    createUploadUrl: jest.fn().mockImplementation(async (input: { key: string }) => ({
      uploadUrl: `https://r2.test/${input.key}?sig=x`,
      privateUrl: `s3://bucket/${input.key}`,
      expiresInSeconds: 300,
    })),
    createReadUrl: jest.fn().mockResolvedValue('https://r2.test/signed'),
  };
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
  const service = new DocumentosService(
    documentos as never,
    storage as never,
    auditLogs as never,
    {} as never,
    {} as never,
  );
  return { service, documentos, storage, auditLogs };
}

function dto(overrides: Record<string, unknown> = {}) {
  return {
    clinicaId: CLINICA_ID,
    pacienteId: PACIENTE_ID,
    nome: TITULO,
    tipo: TipoDocumento.LAUDO,
    mimeType: 'application/pdf' as const,
    tamanho: 1024,
    hash: 'a'.repeat(64),
    ...overrides,
  };
}

describe('DocumentosService — chave do objeto sem dado pessoal (NGS1 #1)', () => {
  it('a chave gerada não contém o título do documento nem o nome do paciente', async () => {
    const { service, storage } = makeService();

    await service.createUploadUrl(dto({ nomePaciente: NOME_PACIENTE }) as never, ctx);

    const { key } = storage.createUploadUrl.mock.calls[0][0];
    expect(key.toLowerCase()).not.toContain('joao');
    expect(key.toLowerCase()).not.toContain('silva');
    expect(key.toLowerCase()).not.toContain('laudo');
  });

  it('a chave tem o formato <clinicaId>/pacientes/<pacienteId>/<uuid>.<ext>', async () => {
    const { service, storage } = makeService();

    await service.createUploadUrl(dto({ nomePaciente: NOME_PACIENTE }) as never, ctx);

    const { key } = storage.createUploadUrl.mock.calls[0][0];
    expect(key).toMatch(new RegExp(`^${CLINICA_ID}/pacientes/${PACIENTE_ID}/${UUID}.pdf$`));
  });

  it.each([
    ['application/pdf', 'pdf'],
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['application/dicom', 'dcm'],
  ])('extensão de %s vem da allowlist: .%s', async (mimeType, ext) => {
    const { service, storage } = makeService();

    await service.createUploadUrl(dto({ mimeType }) as never, ctx);

    const { key } = storage.createUploadUrl.mock.calls[0][0];
    expect(key).toMatch(new RegExp(`^${CLINICA_ID}/pacientes/${PACIENTE_ID}/${UUID}.${ext}$`));
  });

  it('rejeita mimeType fora da allowlist sem gerar URL de upload', async () => {
    const { service, storage } = makeService();

    await expect(
      service.createUploadUrl(dto({ mimeType: 'application/x-msdownload' }) as never, ctx),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.createUploadUrl).not.toHaveBeenCalled();
  });

  it('nomePaciente enviado no DTO não aparece na chave, na URL privada gravada nem na auditoria', async () => {
    const { service, documentos, auditLogs } = makeService();

    await service.createUploadUrl(dto({ nomePaciente: NOME_PACIENTE }) as never, ctx);

    const persistido = JSON.stringify(documentos.create.mock.calls[0][0].url);
    expect(persistido.toLowerCase()).not.toContain('joao');
    expect(JSON.stringify(auditLogs.create.mock.calls).toLowerCase()).not.toContain('joao');
  });
});

describe('DocumentosService.createAccessUrl — nome genérico no download (NGS1 #1)', () => {
  it('pede a URL de leitura com filename genérico documento-AAAA-MM-DD.<ext> e sem o título', async () => {
    const { service, storage } = makeService();

    await service.createAccessUrl('doc-1', CLINICA_ID, ctx);

    const [, , filename] = storage.createReadUrl.mock.calls[0];
    expect(filename).toBe('documento-2026-09-30.pdf');
    expect(String(filename).toLowerCase()).not.toContain('laudo');
    expect(String(filename).toLowerCase()).not.toContain('joao');
  });
});
