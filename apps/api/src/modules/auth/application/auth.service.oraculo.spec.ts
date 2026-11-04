import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { User } from '../domain/user.entity';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(async (senha: string) => senha === 'senha-certa'),
  hash: jest.fn().mockResolvedValue('hash'),
}));

// Oráculo de senha: o login não pode revelar se a senha estava certa. "Senha certa sem código 2FA",
// "senha certa com código errado", "senha errada" e "conta inexistente" têm resposta IDÊNTICA.
const SEGREDO = speakeasy.generateSecret({ length: 20 }).base32;

function usuario(over: Partial<User> = {}): User {
  return {
    id: 'u1', nome: 'Admin', email: 'admin@x.test', passwordHash: 'h', papel: Papel.ADMIN, clinicaId: 'c1',
    ativo: true, criadoEm: new Date(), deveTrocarSenha: false, twoFactorSecret: SEGREDO, ...over,
  };
}

function criar(user: User | null) {
  const users = { findByEmailWithSecrets: jest.fn().mockResolvedValue(user) };
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
  const limiter = {
    assertAllowed: jest.fn().mockResolvedValue(undefined),
    recordFailure: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  };
  const service = new AuthService(
    users as never, auditLogs as never,
    { signAsync: jest.fn().mockResolvedValue('t') } as never,
    { getConfig: () => ({ bcryptRounds: 4, jwtAccessSecret: 'a', jwtRefreshSecret: 'r' }) } as never,
    limiter as never, { isRevoked: jest.fn() } as never,
  );
  return { service, auditLogs, limiter };
}

const ctx = { ip: '127.0.0.1', userAgent: 'jest' };

async function falha(promessa: Promise<unknown>) {
  try {
    await promessa;
  } catch (e) {
    expect(e).toBeInstanceOf(UnauthorizedException);
    const ex = e as UnauthorizedException;
    return { status: ex.getStatus(), corpo: ex.getResponse() };
  }
  throw new Error('deveria ter falhado');
}

describe('AuthService.login – sem oráculo de senha', () => {
  it('senha certa SEM código 2FA é indistinguível de senha errada (status e corpo)', async () => {
    const semCodigo = await falha(criar(usuario()).service.login({ email: 'admin@x.test', password: 'senha-certa' }, ctx));
    const errada = await falha(criar(usuario()).service.login({ email: 'admin@x.test', password: 'errada' }, ctx));
    expect(semCodigo).toEqual(errada);
    expect(JSON.stringify(semCodigo.corpo)).not.toMatch(/2fa|codigo/i);
  });

  it('senha certa com código 2FA ERRADO também é idêntica', async () => {
    const codigoErrado = await falha(
      criar(usuario()).service.login({ email: 'admin@x.test', password: 'senha-certa', totpCode: '000000' }, ctx),
    );
    const errada = await falha(criar(usuario()).service.login({ email: 'admin@x.test', password: 'errada' }, ctx));
    expect(codigoErrado).toEqual(errada);
  });

  it('conta inexistente e conta inativa também são idênticas', async () => {
    const errada = await falha(criar(usuario()).service.login({ email: 'admin@x.test', password: 'errada' }, ctx));
    expect(await falha(criar(null).service.login({ email: 'ninguem@x.test', password: 'x' }, ctx))).toEqual(errada);
    expect(
      await falha(criar(usuario({ ativo: false })).service.login({ email: 'admin@x.test', password: 'senha-certa' }, ctx)),
    ).toEqual(errada);
  });

  it('tempo: conta inexistente também paga o custo do bcrypt (sem atalho cronometrável)', async () => {
    (bcrypt.compare as jest.Mock).mockClear();
    await falha(criar(null).service.login({ email: 'ninguem@x.test', password: 'x' }, ctx));
    expect(bcrypt.compare).toHaveBeenCalledTimes(1);
  });

  it('a causa real continua na auditoria (só o servidor sabe)', async () => {
    const { service, auditLogs } = criar(usuario());
    await falha(service.login({ email: 'admin@x.test', password: 'senha-certa' }, ctx));
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ reason: 'INVALID_2FA' }) }),
    );
  });

  it('senha certa + código certo continua entrando', async () => {
    const codigo = speakeasy.totp({ secret: SEGREDO, encoding: 'base32' });
    const res = await criar(usuario()).service.login({ email: 'admin@x.test', password: 'senha-certa', totpCode: codigo }, ctx);
    expect(res.accessToken).toBeDefined();
  });
});
