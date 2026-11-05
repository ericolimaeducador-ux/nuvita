import { Papel } from '../../../../../../packages/shared/src/auth';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { ClinicasService } from './clinicas.service';
import { SuperAdminService } from '../../super-admin/super-admin.service';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hash-bcrypt') }));

// 3.3: a criação de usuário registra QUEM criou, QUANDO (timestamp do audit log), QUE PAPEL e o COREN.
const criado = (over: Record<string, unknown> = {}) => ({
  id: 'novo-1', nome: 'Dra. Ana', email: 'ana@clinica.test', papel: Papel.ENFERMEIRO, clinicaId: 'cli-1', ativo: true,
  ...over,
});

describe('ClinicasService.createUsuario – auditoria da criação', () => {
  function montar(user = criado()) {
    const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
    const service = new ClinicasService(
      { findById: jest.fn().mockResolvedValue({ id: 'cli-1', ativo: true }) } as never,
      { findByEmail: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(user) } as never,
      auditLogs as never,
      { getConfig: () => ({ bcryptRounds: 4, totpIssuer: 'Nuvita' }) } as never,
      {} as never,
    );
    return { service, auditLogs };
  }
  const admin = {
    ip: '10.0.0.1', userAgent: 'jest',
    user: { sub: 'adm-1', email: 'admin@clinica.test', papel: Papel.ADMIN, clinicaId: 'cli-1', jti: 'j', typ: 'access' as const },
  };
  const dto = { nome: 'Dra. Ana', email: 'ana@clinica.test', password: 'senhaGerada123', papel: Papel.ENFERMEIRO as const };

  it('grava quem criou (id, e-mail e papel), o papel e o COREN do criado, e a clínica', async () => {
    const { service, auditLogs } = montar(criado({ coren: '06/123456' }));
    await service.createUsuario('cli-1', dto, admin);
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event: AuditEvent.USER_CREATED_BY_ADMIN,
        userId: 'adm-1',
        email: 'admin@clinica.test',
        clinicaId: 'cli-1',
        metadata: expect.objectContaining({
          criadorPapel: Papel.ADMIN,
          createdUserId: 'novo-1',
          createdUserPapel: Papel.ENFERMEIRO,
          createdUserCoren: '06/123456',
        }),
      }),
    );
  });

  it('COREN ainda não informado (o enfermeiro o preenche depois): registra null, não omite a chave', async () => {
    const { service, auditLogs } = montar();
    await service.createUsuario('cli-1', dto, admin);
    const metadata = (auditLogs.create.mock.calls[0][0] as { metadata: Record<string, unknown> }).metadata;
    expect(metadata).toHaveProperty('createdUserCoren', null);
  });
});

describe('SuperAdminService.createUsuario – auditoria da criação', () => {
  function montar(user = criado({ clinicaId: 'cli-9' })) {
    const registrar = jest.fn().mockResolvedValue(undefined);
    const service = new SuperAdminService(
      { findByEmail: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue(user) } as never,
      { findById: jest.fn().mockResolvedValue({ id: 'cli-9', faseTeste: false }) } as never,
      { getConfig: () => ({ bcryptRounds: 4, totpIssuer: 'Nuvita' }) } as never,
      { registrarAuditoriaAdministrativa: registrar } as never,
    );
    return { service, registrar };
  }
  const contexto = { ip: '10.0.0.2', userAgent: 'jest', userId: 'sa-1' };
  const dto = { nome: 'Dra. Ana', email: 'ana@clinica.test', password: 'senhaGerada123', papel: Papel.ENFERMEIRO, clinicaId: 'cli-9' };

  it('a criação pelo super-admin deixa registro: quem, papel, clínica e COREN', async () => {
    const { service, registrar } = montar(criado({ clinicaId: 'cli-9', coren: '06/999' }));
    await service.createUsuario(dto as never, contexto);
    expect(registrar).toHaveBeenCalledWith(
      expect.objectContaining({
        event: AuditEvent.USER_CREATED_BY_SUPER_ADMIN,
        userId: 'sa-1',
        clinicaId: 'cli-9',
        ip: '10.0.0.2',
        metadata: expect.objectContaining({ createdUserId: 'novo-1', createdUserPapel: Papel.ENFERMEIRO, createdUserCoren: '06/999' }),
      }),
    );
  });

  it('o registro não carrega senha nem segredo do 2FA', async () => {
    const { service, registrar } = montar();
    await service.createUsuario({ ...dto, papel: Papel.ADMIN } as never, contexto);
    const texto = JSON.stringify(registrar.mock.calls[0][0]);
    expect(texto).not.toContain('senhaGerada123');
    expect(texto).not.toMatch(/otpauth|base32|passwordHash|twoFactorSecret/i);
  });
});
