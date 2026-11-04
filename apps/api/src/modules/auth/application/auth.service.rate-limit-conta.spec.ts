import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { User } from '../domain/user.entity';
import { AuthService } from './auth.service';
import { AuditLogRepository } from './ports/audit-log.repository';
import { UserRepository } from './ports/user.repository';

jest.mock('bcrypt', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('hash'),
}));

/**
 * NGS1 #3 (contorno por login bem-sucedido) — fiação: o AuthService passa o
 * e-mail (normalizado) ao limitador em assertAllowed, recordFailure e clear,
 * para o contador ser por (ip, conta) e não por IP inteiro.
 */
const user: User = {
  id: 'u1',
  nome: 'Fulana',
  email: 'fulana@nuvita.test',
  passwordHash: 'hash-bcrypt',
  papel: Papel.SECRETARIA,
  clinicaId: 'c1',
  ativo: true,
  criadoEm: new Date('2026-09-10T00:00:00.000Z'),
  deveTrocarSenha: false,
  termosAceitos: null,
};

const context = { ip: '203.0.113.7', userAgent: 'jest' };

function makeService(achado: User | null = user) {
  const users = {
    findByEmailWithSecrets: jest.fn().mockResolvedValue(achado),
    update: jest.fn(),
  } as unknown as UserRepository;
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) } as unknown as AuditLogRepository;
  const jwtService = { signAsync: jest.fn().mockResolvedValue('signed-token') };
  const configService = {
    getConfig: jest.fn().mockReturnValue({ bcryptRounds: 12, jwtAccessSecret: 'a', jwtRefreshSecret: 'r' }),
  };
  const loginRateLimiter = {
    assertAllowed: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    recordFailure: jest.fn().mockResolvedValue(undefined),
  };
  const tokenRevocation = { isRevoked: jest.fn().mockResolvedValue(false), revoke: jest.fn() };

  const service = new AuthService(
    users,
    auditLogs,
    jwtService as never,
    configService as never,
    loginRateLimiter as never,
    tokenRevocation as never,
  );
  return { service, loginRateLimiter };
}

describe('AuthService.login — limitador por conta (NGS1 #3)', () => {
  it('consulta o limite com (ip, e-mail normalizado)', async () => {
    const { service, loginRateLimiter } = makeService();

    await service.login({ email: 'FULANA@Nuvita.Test', password: 'x' }, context);

    expect(loginRateLimiter.assertAllowed).toHaveBeenCalledWith(context.ip, 'fulana@nuvita.test');
  });

  it('login bem-sucedido zera só o par (ip, conta), nunca o IP inteiro', async () => {
    const { service, loginRateLimiter } = makeService();

    await service.login({ email: 'fulana@nuvita.test', password: 'x' }, context);

    expect(loginRateLimiter.clear).toHaveBeenCalledWith(context.ip, 'fulana@nuvita.test');
  });

  it('senha errada registra a falha no par (ip, conta)', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
    const { service, loginRateLimiter } = makeService();

    await expect(service.login({ email: 'fulana@nuvita.test', password: 'errada' }, context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(loginRateLimiter.recordFailure).toHaveBeenCalledWith(context.ip, 'fulana@nuvita.test');
  });

  it('conta inexistente também conta a falha no par (sem enumeração de contas)', async () => {
    const { service, loginRateLimiter } = makeService(null);

    await expect(service.login({ email: 'ninguem@nuvita.test', password: 'x' }, context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(loginRateLimiter.recordFailure).toHaveBeenCalledWith(context.ip, 'ninguem@nuvita.test');
  });
});
