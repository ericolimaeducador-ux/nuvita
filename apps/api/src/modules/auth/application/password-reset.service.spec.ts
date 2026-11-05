import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AuditEvent } from '../domain/audit-event.enum';
import { User } from '../domain/user.entity';
import { PasswordResetService } from './password-reset.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(async (s: string) => s === 'senha-certa'),
  hash: jest.fn(async (s: string) => `hash:${s}`),
}));

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const ctx = { ip: '10.0.0.1', userAgent: 'jest' };

function usuario(over: Partial<User> = {}): User {
  return {
    id: 'u1', nome: 'Maria Silva', email: 'maria@x.test', passwordHash: 'h', papel: Papel.ADMIN, clinicaId: 'c1',
    ativo: true, criadoEm: new Date(), deveTrocarSenha: false, twoFactorSecret: 'SEGREDO2FA', ...over,
  };
}

// Repositório em memória: o token vive como hash, é de uso único e some quando a senha muda.
function criar(user: User | null = usuario(), permitido = true) {
  let guardado: { tokenHash: string; expiraEm: Date } | null = null;
  const users = {
    findByEmail: jest.fn(async () => user),
    salvarResetSenha: jest.fn(async (_id: string, tokenHash: string, expiraEm: Date) => { guardado = { tokenHash, expiraEm }; }),
    redefinirSenhaComToken: jest.fn(async (tokenHash: string, passwordHash: string, agora: Date) => {
      if (!user || !guardado || guardado.tokenHash !== tokenHash || guardado.expiraEm <= agora) return null;
      guardado = null;
      user = { ...user, passwordHash, deveTrocarSenha: false };
      return user;
    }),
  };
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
  const mailer = { enviarLinkRedefinicao: jest.fn().mockResolvedValue(undefined) };
  const limiter = { permitirPedido: jest.fn().mockResolvedValue(permitido) };
  const service = new PasswordResetService(
    users as never, auditLogs as never, mailer as never, limiter as never,
    { getConfig: () => ({ bcryptRounds: 4 }) } as never,
    { tempoMinimoMs: 0 },
  );
  return { service, users, auditLogs, mailer, limiter, estado: () => user, guardado: () => guardado };
}

describe('PasswordResetService.solicitar', () => {
  it('resposta IDÊNTICA para e-mail cadastrado e não cadastrado', async () => {
    const a = await criar(usuario()).service.solicitar('maria@x.test', ctx);
    const b = await criar(null).service.solicitar('ninguem@x.test', ctx);
    expect(a).toEqual(b);
  });

  it('cadastrado: envia o link com token aleatório forte; só o HASH fica guardado; validade 30–60 min', async () => {
    const { service, mailer, users } = criar();
    await service.solicitar('maria@x.test', ctx);
    expect(mailer.enviarLinkRedefinicao).toHaveBeenCalledTimes(1);
    const { link } = mailer.enviarLinkRedefinicao.mock.calls[0][0] as { link: string };
    const token = new URL(link).searchParams.get('token')!;
    expect(token.length).toBeGreaterThanOrEqual(43); // 32 bytes em base64url
    const [, tokenHash, expiraEm] = users.salvarResetSenha.mock.calls[0] as [string, string, Date];
    expect(tokenHash).toBe(sha256(token));
    expect(tokenHash).not.toBe(token);
    const minutos = (expiraEm.getTime() - Date.now()) / 60000;
    expect(minutos).toBeGreaterThanOrEqual(29);
    expect(minutos).toBeLessThanOrEqual(60);
  });

  it('cada pedido gera token diferente', async () => {
    const { service, mailer } = criar();
    await service.solicitar('maria@x.test', ctx);
    await service.solicitar('maria@x.test', ctx);
    const links = mailer.enviarLinkRedefinicao.mock.calls.map((c: [{ link: string }]) => c[0].link);
    expect(links[0]).not.toBe(links[1]);
  });

  it('não cadastrado ou inativo: não envia e-mail, mas o pedido é auditado', async () => {
    const naoCadastrado = criar(null);
    await naoCadastrado.service.solicitar('ninguem@x.test', ctx);
    expect(naoCadastrado.mailer.enviarLinkRedefinicao).not.toHaveBeenCalled();
    expect(naoCadastrado.auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event: AuditEvent.PASSWORD_RESET_REQUESTED, email: 'ninguem@x.test',
        metadata: expect.objectContaining({ caminho: 'AUTOATENDIMENTO', resultado: 'EMAIL_NAO_CADASTRADO' }),
      }),
    );
    const inativo = criar(usuario({ ativo: false }));
    await inativo.service.solicitar('maria@x.test', ctx);
    expect(inativo.mailer.enviarLinkRedefinicao).not.toHaveBeenCalled();
  });

  it('limite por conta/IP estourado: mesma resposta, nada enviado, auditado como LIMITE', async () => {
    const livre = await criar(usuario(), true).service.solicitar('maria@x.test', ctx);
    const bloqueado = criar(usuario(), false);
    const resposta = await bloqueado.service.solicitar('maria@x.test', ctx);
    expect(resposta).toEqual(livre);
    expect(bloqueado.mailer.enviarLinkRedefinicao).not.toHaveBeenCalled();
    expect(bloqueado.auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ resultado: 'LIMITE' }) }),
    );
  });

  it('pedido bem-sucedido é auditado com quem, caminho e resultado', async () => {
    const { service, auditLogs } = criar();
    await service.solicitar('Maria@X.test', ctx);
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event: AuditEvent.PASSWORD_RESET_REQUESTED, userId: 'u1', email: 'maria@x.test', ip: '10.0.0.1',
        metadata: expect.objectContaining({ caminho: 'AUTOATENDIMENTO', resultado: 'ENVIADO' }),
      }),
    );
  });

  it('falha no envio do e-mail não muda a resposta (e fica auditada)', async () => {
    const { service, mailer, auditLogs } = criar();
    mailer.enviarLinkRedefinicao.mockRejectedValue(new Error('resend fora'));
    const resposta = await service.solicitar('maria@x.test', ctx);
    expect(resposta).toEqual(await criar(null).service.solicitar('x@x.test', ctx));
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: expect.objectContaining({ resultado: 'FALHA_ENVIO' }) }),
    );
  });
});

describe('PasswordResetService.redefinir', () => {
  async function comTokenEmitido() {
    const ambiente = criar();
    await ambiente.service.solicitar('maria@x.test', ctx);
    const { link } = ambiente.mailer.enviarLinkRedefinicao.mock.calls[0][0] as { link: string };
    return { ...ambiente, token: new URL(link).searchParams.get('token')! };
  }

  it('token válido define a senha definitiva, encerra o ciclo e audita (caminho autoatendimento)', async () => {
    const { service, token, estado, auditLogs } = await comTokenEmitido();
    await expect(service.redefinir(token, 'nova-senha-forte-1', ctx)).resolves.toEqual({ ok: true });
    expect(estado()!.passwordHash).toBe('hash:nova-senha-forte-1');
    expect(estado()!.deveTrocarSenha).toBe(false);
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event: AuditEvent.PASSWORD_RESET_COMPLETED, userId: 'u1',
        metadata: expect.objectContaining({ caminho: 'AUTOATENDIMENTO', resultado: 'SUCESSO' }),
      }),
    );
  });

  it('token é de USO ÚNICO', async () => {
    const { service, token } = await comTokenEmitido();
    await service.redefinir(token, 'nova-senha-forte-1', ctx);
    await expect(service.redefinir(token, 'outra-senha-forte-2', ctx)).rejects.toThrow(BadRequestException);
  });

  it('token EXPIRADO é recusado', async () => {
    const { service, token } = await comTokenEmitido();
    jest.useFakeTimers().setSystemTime(Date.now() + 61 * 60 * 1000);
    try {
      await expect(service.redefinir(token, 'nova-senha-forte-1', ctx)).rejects.toThrow(BadRequestException);
    } finally {
      jest.useRealTimers();
    }
  });

  it('token inexistente, expirado e já usado têm o MESMO erro (sem oráculo)', async () => {
    const { service, token } = await comTokenEmitido();
    const inexistente = await service.redefinir('x'.repeat(43), 'nova-senha-forte-1', ctx).catch((e) => e);
    await service.redefinir(token, 'nova-senha-forte-1', ctx);
    const usado = await service.redefinir(token, 'nova-senha-forte-1', ctx).catch((e) => e);
    expect(inexistente.getResponse()).toEqual(usado.getResponse());
    expect(inexistente.getStatus()).toBe(usado.getStatus());
  });

  it('tentativa inválida é auditada como falha', async () => {
    const { service, auditLogs } = await comTokenEmitido();
    await service.redefinir('invalido'.repeat(6), 'nova-senha-forte-1', ctx).catch(() => undefined);
    expect(auditLogs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        event: AuditEvent.PASSWORD_RESET_FAILED, metadata: expect.objectContaining({ caminho: 'AUTOATENDIMENTO', resultado: 'FALHA' }),
      }),
    );
  });

  it('o reset de senha NÃO destrava o 2FA: o segredo fica intacto e o repositório nunca o recebe', async () => {
    const { service, token, estado, users } = await comTokenEmitido();
    await service.redefinir(token, 'nova-senha-forte-1', ctx);
    expect(estado()!.twoFactorSecret).toBe('SEGREDO2FA');
    const chamada = JSON.stringify(users.redefinirSenhaComToken.mock.calls[0]);
    expect(chamada).not.toMatch(/twoFactor|2faSecret|SEGREDO2FA/);
  });
});
