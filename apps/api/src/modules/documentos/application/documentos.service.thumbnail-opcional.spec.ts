import { Logger } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { TipoDocumento } from '../domain/documento.entity';
import { DocumentosService } from './documentos.service';

/**
 * Miniatura é best-effort: falha ao gerá-la (sharp, GetObject, PutObject) NÃO pode virar 500 no
 * confirmar-upload. O objeto já foi validado pelo HeadObject e `confirmadoEm` já foi gravado.
 */
const TITULO_SENTINELA = 'LAUDO-NEUROPSICOLOGICO-XYZ';

const imagem = {
  id: 'doc-1',
  clinicaId: 'cli-1',
  pacienteId: 'pac-1',
  prontuarioId: 'pront-1',
  nome: TITULO_SENTINELA,
  tipo: TipoDocumento.LAUDO,
  mimeType: 'image/jpeg',
  tamanho: 1024,
  hash: 'ab'.repeat(32),
  uploadPor: 'user-1',
  criadoEm: new Date('2026-10-15T11:00:00.000Z'),
  url: 's3://bucket/cli-1/pacientes/pac-1/doc-1.jpg',
  confirmadoEm: null as Date | null,
};

const ctx = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: { sub: 'user-1', email: 'secretaria@clinica.test', papel: Papel.SECRETARIA, clinicaId: 'cli-1', jti: 'j1', typ: 'access' as const },
};

function makeService(thumbnail: jest.Mock) {
  const documentos = {
    findById: jest.fn().mockResolvedValue({ ...imagem }),
    setThumbnail: jest.fn().mockResolvedValue(undefined),
    setConfirmadoEm: jest.fn().mockResolvedValue(undefined),
  };
  const storage = {
    headObject: jest.fn().mockResolvedValue({ tamanho: imagem.tamanho }),
    createThumbnailIfSupported: thumbnail,
  };
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
  const pacientesService = { resumoPorIds: jest.fn().mockResolvedValue(new Map()) };
  const notificacoesService = { create: jest.fn().mockResolvedValue(undefined) };
  const service = new DocumentosService(
    documentos as never,
    storage as never,
    auditLogs as never,
    pacientesService as never,
    notificacoesService as never,
  );
  return { service, documentos, auditLogs };
}

describe('DocumentosService.confirmUpload — miniatura não-fatal', () => {
  afterEach(() => jest.restoreAllMocks());

  it('falha ao gerar a miniatura: confirma com sucesso, sem thumbnailUrl, e preserva confirmadoEm', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { service, documentos, auditLogs } = makeService(
      jest.fn().mockRejectedValue(new TypeError('(0 , sharp_1.default) is not a function')),
    );

    const r = await service.confirmUpload('doc-1', 'cli-1', ctx);

    expect(r.confirmadoEm).toBeInstanceOf(Date);
    expect(documentos.setConfirmadoEm).toHaveBeenCalledTimes(1);
    expect(r.thumbnailUrl).toBeUndefined();
    expect(documentos.setThumbnail).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
    const evento = auditLogs.create.mock.calls.find(([e]) => e?.event === AuditEvent.DOCUMENT_UPLOAD_CONFIRMED)?.[0];
    expect(evento?.metadata).toMatchObject({ thumbnail: false });
  });

  it('o aviso de log traz só ids e a mensagem do erro: sem título do documento nem segredo', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { service } = makeService(jest.fn().mockRejectedValue(new Error('falha ao gerar miniatura')));

    await service.confirmUpload('doc-1', 'cli-1', ctx);

    const mensagem = String(warn.mock.calls[0][0]);
    expect(mensagem).toContain('doc-1');
    expect(mensagem).not.toContain(TITULO_SENTINELA);
    expect(mensagem).not.toContain('s3://');
  });

  it('miniatura gerada normalmente continua sendo gravada', async () => {
    const { service, documentos } = makeService(jest.fn().mockResolvedValue('s3://bucket/doc-1.jpg.thumb.jpg'));

    const r = await service.confirmUpload('doc-1', 'cli-1', ctx);

    expect(r.thumbnailUrl).toBe('s3://bucket/doc-1.jpg.thumb.jpg');
    expect(documentos.setThumbnail).toHaveBeenCalledWith('cli-1', 'doc-1', 's3://bucket/doc-1.jpg.thumb.jpg');
  });
});
