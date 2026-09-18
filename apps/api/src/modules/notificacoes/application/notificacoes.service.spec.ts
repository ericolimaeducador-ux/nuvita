import { Papel } from '../../../../../../packages/shared/src/auth';
import { CanalNotificacao, TipoNotificacao } from '../domain/notificacao.entity';
import { NotificacoesService } from './notificacoes.service';

/**
 * feature-consultation-reminder-scheduler: cobre só a adição de
 * `context.automatedActor` (ver infra/PENDENCIAS.md #15) — não é uma
 * suíte completa de NotificacoesService (não havia nenhuma até aqui).
 * automatedActor=true precisa estampar metadata.automatedActor=true nos
 * audit logs; sem a flag (todo caller pré-existente), o comportamento
 * deve continuar idêntico a antes desta mudança.
 */
const notificacaoCriada = {
  id: 'not-1',
  clinicaId: 'cli-1',
  destinatarioId: 'pac-1',
  tipo: TipoNotificacao.LEMBRETE_CONSULTA_24H,
  canal: CanalNotificacao.EMAIL,
};

function makeService(overrides: { auditLogs?: Record<string, jest.Mock> } = {}) {
  const notificacoes = {
    create: jest.fn().mockResolvedValue(notificacaoCriada),
    markQueued: jest.fn().mockResolvedValue(undefined),
  };
  const preferencias = { findByPaciente: jest.fn().mockResolvedValue(null) };
  const queue = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined), ...overrides.auditLogs };
  const templates = { render: jest.fn().mockReturnValue({ assunto: 'Assunto', mensagem: 'Mensagem' }) };
  const windowService = { delayUntilAllowed: jest.fn().mockReturnValue(0) };

  const service = new NotificacoesService(
    notificacoes as never,
    preferencias as never,
    queue as never,
    auditLogs as never,
    templates as never,
    windowService as never,
  );

  return { service, auditLogs };
}

const dto = {
  clinicaId: 'cli-1',
  destinatarioId: 'pac-1',
  tipo: TipoNotificacao.LEMBRETE_CONSULTA_24H,
  canal: CanalNotificacao.EMAIL,
  email: 'paciente@nuvita.test',
  nome: 'Paciente',
} as never;

describe('NotificacoesService.create() — context.automatedActor', () => {
  it('estampa metadata.automatedActor=true quando context.automatedActor=true', async () => {
    const { service, auditLogs } = makeService();
    const context = {
      ip: 'internal',
      userAgent: 'consultation-reminder-scheduler',
      user: { sub: 'system:x', email: 'system@nuvita.internal', papel: Papel.SUPER_ADMIN, clinicaId: 'cli-1', jti: 'j', typ: 'access' as const },
      automatedActor: true,
    };

    await service.create(dto, context);

    for (const call of auditLogs.create.mock.calls) {
      expect(call[0].metadata).toEqual(expect.objectContaining({ automatedActor: true }));
    }
  });

  it('NÃO adiciona automatedActor quando ausente (comportamento de todo caller pré-existente, sem mudança)', async () => {
    const { service, auditLogs } = makeService();
    const context = {
      ip: '127.0.0.1',
      userAgent: 'jest',
      user: { sub: 'user-1', email: 'secretaria@clinica.test', papel: Papel.SECRETARIA, clinicaId: 'cli-1', jti: 'j', typ: 'access' as const },
    };

    await service.create(dto, context);

    for (const call of auditLogs.create.mock.calls) {
      expect(call[0].metadata).not.toHaveProperty('automatedActor');
    }
  });
});
