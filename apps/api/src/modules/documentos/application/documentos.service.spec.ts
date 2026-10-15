import { Logger } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { CanalNotificacao, TipoNotificacao } from '../../notificacoes/domain/notificacao.entity';
import { TipoDocumento } from '../domain/documento.entity';
import { DocumentosService } from './documentos.service';

const documentoExistente = {
  id: 'doc-1',
  clinicaId: 'cli-1',
  pacienteId: 'pac-1',
  prontuarioId: 'pront-1',
  nome: 'Laudo neuropsicológico',
  tipo: TipoDocumento.LAUDO,
  mimeType: 'application/pdf' as const,
  tamanho: 1024,
  url: 'clinica/pacientes/pac-1/doc-1.pdf',
  hash: 'abc123',
  uploadPor: 'user-1',
  criadoEm: new Date(),
};

const ctx = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: { sub: 'user-1', email: 'secretaria@clinica.test', papel: Papel.SECRETARIA, clinicaId: 'cli-1', jti: 'j1', typ: 'access' as const },
};

// Fase única: fecha o gap de wiring de Categoria A (resultado_disponivel).
// Mesmo padrão dos pontos 1 e 2: NotificacoesService.create() (método
// público — enfileira de verdade), efeito colateral não crítico, falha
// logada via notification_trigger_failed (fail-closed com visibilidade).
function makeService(overrides: {
  documentos?: Record<string, jest.Mock>;
  storage?: Record<string, jest.Mock>;
  auditLogs?: Record<string, jest.Mock>;
  pacientesService?: Record<string, jest.Mock>;
  notificacoesService?: Record<string, jest.Mock>;
} = {}) {
  const documentos = {
    findById: jest.fn().mockResolvedValue(documentoExistente),
    setThumbnail: jest.fn().mockResolvedValue(undefined),
    setConfirmadoEm: jest.fn().mockResolvedValue(undefined),
    ...overrides.documentos,
  };
  const storage = {
    createThumbnailIfSupported: jest.fn().mockResolvedValue(undefined),
    headObject: jest.fn().mockResolvedValue({ tamanho: 1024 }),
    ...overrides.storage,
  };
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined), ...overrides.auditLogs };
  const pacientesService = {
    resumoPorIds: jest.fn().mockResolvedValue(
      new Map([['pac-1', { nome: 'Paciente Teste', cpf: '11122233344', email: 'paciente@teste.com', nomeDestinatario: 'Paciente Teste', ehResponsavel: false }]]),
    ),
    ...overrides.pacientesService,
  };
  const notificacoesService = {
    create: jest.fn().mockResolvedValue(undefined),
    ...overrides.notificacoesService,
  };

  // 5 argumentos — assinatura alvo, com PacientesService/NotificacoesService
  // injetados. Contra o construtor atual (3 argumentos) isto é um erro de
  // tipo/aridade: Red esperado para uma mudança que introduz novas
  // dependências de construtor, não uma falha de asserção em runtime.
  const service = new DocumentosService(
    documentos as never,
    storage as never,
    auditLogs as never,
    pacientesService as never,
    notificacoesService as never,
  );

  return { service, documentos, storage, auditLogs, pacientesService, notificacoesService };
}

describe('DocumentosService.confirmUpload — wiring de resultado_disponivel (Categoria A)', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('confirma o upload e audita DOCUMENT_UPLOAD_CONFIRMED (comportamento já existente, não deve regredir)', async () => {
    const { service, auditLogs } = makeService();

    const resultado = await service.confirmUpload('doc-1', 'cli-1', ctx);

    expect(resultado.id).toBe('doc-1');
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ event: AuditEvent.DOCUMENT_UPLOAD_CONFIRMED }),
    );
  });

  it('aciona NotificacoesService.create() com os dados de resultado_disponivel, incluindo o nome do documento', async () => {
    const { service, notificacoesService } = makeService();

    await service.confirmUpload('doc-1', 'cli-1', ctx);

    expect(notificacoesService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clinicaId: 'cli-1',
        destinatarioId: 'pac-1',
        tipo: TipoNotificacao.RESULTADO_DISPONIVEL,
        canal: CanalNotificacao.EMAIL,
        email: 'paciente@teste.com',
        nome: 'Paciente Teste',
        documento: 'Laudo neuropsicológico',
      }),
      ctx,
    );
  });

  it('paciente sem e-mail cadastrado → não aciona NotificacoesService, mas a confirmação de upload prossegue normalmente', async () => {
    const { service, notificacoesService, documentos } = makeService({
      pacientesService: {
        resumoPorIds: jest.fn().mockResolvedValue(
          new Map([['pac-1', { nome: 'Paciente Sem Email', cpf: '11122233344' }]]),
        ),
      },
    });

    const resultado = await service.confirmUpload('doc-1', 'cli-1', ctx);

    expect(resultado.id).toBe('doc-1');
    expect(documentos.findById).toHaveBeenCalled();
    expect(notificacoesService.create).not.toHaveBeenCalled();
  });

  it('falha em NotificacoesService.create() não derruba a confirmação de upload, e loga o evento estruturado notification_trigger_failed', async () => {
    const { service, notificacoesService } = makeService({
      notificacoesService: { create: jest.fn().mockRejectedValue(new Error('falha no envio')) },
    });

    const resultado = await service.confirmUpload('doc-1', 'cli-1', ctx);

    expect(resultado.id).toBe('doc-1');
    expect(notificacoesService.create).toHaveBeenCalled();

    expect(warnSpy).toHaveBeenCalled();
    const payload = JSON.parse(warnSpy.mock.calls[0][0] as string);
    expect(payload).toMatchObject({
      level: 'warn',
      event: 'notification_trigger_failed',
      tipo: TipoNotificacao.RESULTADO_DISPONIVEL,
      clinicaId: 'cli-1',
      erro: 'falha no envio',
    });
  });
});
