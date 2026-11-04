import { Papel } from '../../../../../../packages/shared/src/auth';
import { ClinicasService } from '../../clinicas/application/clinicas.service';
import { SuperAdminService } from '../../super-admin/super-admin.service';

// Troca obrigatória da senha provisória para TODOS os papéis (admin e secretária inclusos).
const usuarioCriado = (papel: Papel) => ({ id: 'n1', nome: 'N', email: 'n@x.test', papel, ativo: true, clinicaId: 'cli-1' });

describe('senha provisória: troca obrigatória para todos os papéis', () => {
  const adminCtx = {
    ip: '127.0.0.1', userAgent: 'jest',
    user: { sub: 'adm', email: 'a@x.test', papel: Papel.ADMIN, clinicaId: 'cli-1', jti: 'j', typ: 'access' as const },
  };

  it.each([Papel.PSICOLOGO, Papel.SECRETARIA])('admin da clínica cria %s com deveTrocarSenha=true', async (papel) => {
    const users = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(usuarioCriado(papel)),
    };
    const service = new ClinicasService(
      { findById: jest.fn().mockResolvedValue({ id: 'cli-1', ativo: true }) } as never,
      users as never, { create: jest.fn() } as never,
      { getConfig: () => ({ bcryptRounds: 4, totpIssuer: 'Nuvita' }) } as never, {} as never,
    );
    await service.createUsuario('cli-1', { nome: 'N', email: 'n@x.test', password: 'senhaGerada123', papel: papel as never }, adminCtx);
    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({ deveTrocarSenha: true }));
  });

  it.each([Papel.ADMIN, Papel.SECRETARIA, Papel.PSICOLOGO])('super-admin cria %s com deveTrocarSenha=true', async (papel) => {
    const users = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(usuarioCriado(papel)),
    };
    const service = new SuperAdminService(
      users as never, {} as never,
      { getConfig: () => ({ bcryptRounds: 4, totpIssuer: 'Nuvita' }) } as never, {} as never,
    );
    await service.createUsuario({ nome: 'N', email: 'n@x.test', password: 'senhaGerada123', papel } as never);
    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({ deveTrocarSenha: true }));
  });

  it('reset de senha pelo super-admin gera senha PROVISÓRIA: exige troca e derruba as sessões', async () => {
    const users = { update: jest.fn().mockResolvedValue({ id: 'u1' }) };
    const service = new SuperAdminService(
      users as never, {} as never, { getConfig: () => ({ bcryptRounds: 4 }) } as never, {} as never,
    );
    await service.resetPassword('u1', 'senhaProvisoria123');
    expect(users.update).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        passwordHash: expect.any(String), deveTrocarSenha: true, tokensValidosApartirDe: expect.any(Date),
      }),
    );
  });
});
