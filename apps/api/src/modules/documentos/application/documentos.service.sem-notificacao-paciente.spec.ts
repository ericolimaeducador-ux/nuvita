import { Papel } from '../../../../../../packages/shared/src/auth';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { TipoDocumento } from '../domain/documento.entity';
import { DocumentosService } from './documentos.service';

/**
 * Upload de documento de prontuário é arquivo INTERNO do profissional: o paciente não tem portal, então
 * confirmar o upload NÃO notifica o paciente (nem o responsável). O template RESULTADO_DISPONIVEL e o
 * EmailSender continuam existindo para a futura feature "enfermeiro envia documento ao paciente".
 */
const ctx = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: { sub: 'user-1', email: 'psi@clinica.test', papel: Papel.ENFERMEIRO, clinicaId: 'cli-1', jti: 'j1', typ: 'access' as const },
};

const documento = (mimeType: string, ext: string) => ({
  id: 'doc-1',
  clinicaId: 'cli-1',
  pacienteId: 'pac-1',
  prontuarioId: 'pront-1',
  nome: 'Laudo',
  tipo: TipoDocumento.LAUDO,
  mimeType,
  tamanho: 1024,
  hash: 'ab'.repeat(32),
  uploadPor: 'user-1',
  criadoEm: new Date('2026-10-15T11:00:00.000Z'),
  url: `s3://bucket/cli-1/pacientes/pac-1/doc-1.${ext}`,
  confirmadoEm: null as Date | null,
});

function makeService(doc: ReturnType<typeof documento>) {
  const documentos = {
    findById: jest.fn().mockResolvedValue({ ...doc }),
    setThumbnail: jest.fn().mockResolvedValue(undefined),
    setConfirmadoEm: jest.fn().mockResolvedValue(undefined),
  };
  const storage = {
    headObject: jest.fn().mockResolvedValue({ tamanho: doc.tamanho }),
    createThumbnailIfSupported: jest.fn().mockResolvedValue(undefined),
  };
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
  const pacientesService = {
    resumoPorIds: jest
      .fn()
      .mockResolvedValue(new Map([['pac-1', { nome: 'Paciente Teste', email: 'paciente@teste.com', nomeDestinatario: 'Paciente Teste', ehResponsavel: false }]])),
  };
  const notificacoesService = { create: jest.fn().mockResolvedValue(undefined) };
  const service = new DocumentosService(
    documentos as never,
    storage as never,
    auditLogs as never,
    pacientesService as never,
    notificacoesService as never,
  );
  return { service, documentos, auditLogs, pacientesService, notificacoesService };
}

describe('DocumentosService.confirmUpload — sem notificação ao paciente', () => {
  it.each([
    ['PDF', documento('application/pdf', 'pdf')],
    ['imagem', documento('image/jpeg', 'jpg')],
  ])('%s de prontuário com paciente que tem e-mail: não chama NotificacoesService.create', async (_nome, doc) => {
    const { service, notificacoesService } = makeService(doc);

    await service.confirmUpload('doc-1', 'cli-1', ctx);

    expect(notificacoesService.create).not.toHaveBeenCalled();
  });

  it('nem sequer busca os dados de contato do paciente', async () => {
    const { service, pacientesService } = makeService(documento('application/pdf', 'pdf'));

    await service.confirmUpload('doc-1', 'cli-1', ctx);

    expect(pacientesService.resumoPorIds).not.toHaveBeenCalled();
  });

  it('a confirmação continua normal: grava confirmadoEm e audita DOCUMENT_UPLOAD_CONFIRMED', async () => {
    const { service, documentos, auditLogs } = makeService(documento('application/pdf', 'pdf'));

    const r = await service.confirmUpload('doc-1', 'cli-1', ctx);

    expect(r.confirmadoEm).toBeInstanceOf(Date);
    expect(documentos.setConfirmadoEm).toHaveBeenCalledTimes(1);
    expect(auditLogs.create).toHaveBeenCalledWith(expect.objectContaining({ event: AuditEvent.DOCUMENT_UPLOAD_CONFIRMED }));
  });
});
