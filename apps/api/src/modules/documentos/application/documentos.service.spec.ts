import { Logger } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
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

  // Upload de prontuário é arquivo interno do profissional: não notifica o paciente (decisão do Erico).
  it('conclui a confirmação do upload de prontuário (confirmadoEm gravado) sem acionar NotificacoesService', async () => {
    const { service, documentos, notificacoesService } = makeService();

    const resultado = await service.confirmUpload('doc-1', 'cli-1', ctx);

    expect(resultado.id).toBe('doc-1');
    expect(resultado.confirmadoEm).toBeInstanceOf(Date);
    expect(documentos.setConfirmadoEm).toHaveBeenCalledTimes(1);
    expect(notificacoesService.create).not.toHaveBeenCalled();
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
});
