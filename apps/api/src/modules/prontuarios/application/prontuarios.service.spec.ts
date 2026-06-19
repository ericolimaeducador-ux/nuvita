import { ConflictException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { Prontuario, TipoAtendimento } from '../domain/prontuario.entity';
import { ProntuariosService } from './prontuarios.service';

describe('ProntuariosService', () => {
  const baseProntuario: Prontuario = {
    id: 'prontuario-1',
    clinicaId: 'clinica-1',
    pacienteId: 'paciente-1',
    medicoId: 'medico-1',
    dataAtendimento: new Date('2026-01-01T12:00:00.000Z'),
    tipo: TipoAtendimento.CONSULTA,
    subjetivo: { queixaPrincipal: 'Dor' },
    objetivo: {},
    avaliacao: {},
    plano: {},
    arquivos: [],
    criadoEm: new Date('2026-01-01T12:00:00.000Z'),
    atualizadoEm: new Date('2026-01-01T12:00:00.000Z'),
  };

  const context = {
    ip: '127.0.0.1',
    userAgent: 'jest',
    user: {
      sub: 'medico-1',
      email: 'medico@nuvita.test',
      papel: Papel.MEDICO,
      clinicaId: 'clinica-1',
      jti: 'jti',
      typ: 'access' as const,
    },
  };

  function serviceWith(prontuarios: Record<string, jest.Mock>) {
    return new ProntuariosService(
      prontuarios as any,
      { autocomplete: jest.fn() } as any,
      { create: jest.fn() } as any,
      { getConfig: () => ({ prontuarioSignatureSecret: 'signature-secret' }) } as any,
    );
  }

  it('does not update signed medical records', async () => {
    const service = serviceWith({
      findById: jest.fn().mockResolvedValue({
        ...baseProntuario,
        assinado: {
          medicoId: 'medico-1',
          dataAssinatura: new Date('2026-01-02T12:00:00.000Z'),
          hash: 'hash',
        },
      }),
    });

    await expect(
      service.updateDraft('prontuario-1', { plano: { conduta: 'Nova conduta' } }, undefined, context),
    ).rejects.toThrow(ConflictException);
  });

  it('signs a draft with a deterministic HMAC-shaped hash and audit metadata', async () => {
    const sign = jest.fn().mockImplementation((_clinicaId, _id, input) => ({
      ...baseProntuario,
      assinado: input,
    }));
    const auditLogs = { create: jest.fn() };
    const service = new ProntuariosService(
      { findById: jest.fn().mockResolvedValue(baseProntuario), sign } as any,
      { autocomplete: jest.fn() } as any,
      auditLogs as any,
      { getConfig: () => ({ prontuarioSignatureSecret: 'signature-secret' }) } as any,
    );

    await service.sign('prontuario-1', undefined, context);

    expect(sign).toHaveBeenCalledWith(
      'clinica-1',
      'prontuario-1',
      expect.objectContaining({
        medicoId: 'medico-1',
        hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event: AuditEvent.MEDICAL_RECORD_SIGNED,
        userId: 'medico-1',
      }),
    );
  });
});
