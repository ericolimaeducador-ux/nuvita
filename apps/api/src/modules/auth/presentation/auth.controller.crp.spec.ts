import { BadRequestException, ConflictException, ValidationPipe } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AuditEvent } from '../domain/audit-event.enum';
import { toPublicUser, User } from '../domain/user.entity';
import { UserSchema } from '../infrastructure/mongo/user.schema';
import { AuthController } from './auth.controller';

/**
 * CRP na conta do usuário (feature-timbre-clinico-dinamico, PR 1 backend).
 * Modelo decidido: o profissional preenche o PRÓPRIO CRP uma única vez (PATCH /auth/me); depois de
 * preenchido fica travado (409) e só o super-admin corrige (ver super-admin.service.crp.spec.ts).
 * Contratos novos assumidos (não existem hoje):
 *   User.crp?: string  /  UserSchema com o path `crp`
 *   AuthService.atualizarMeuCrp(userId, crp, context): Promise<{ user: PublicUser }>
 *   AuthController.atualizarPerfil(dto: AtualizarPerfilDto, user, request)  — @Patch('me')
 *   AtualizarPerfilDto { crp: string }  (em application/dto/atualizar-perfil.dto.ts)
 */
const userBase: User = {
  id: 'u1',
  nome: 'Fulano',
  email: 'fulano@clinica.test',
  passwordHash: 'x',
  papel: Papel.PSICOLOGO,
  clinicaId: 'cli-A',
  ativo: true,
  criadoEm: new Date('2026-01-01T00:00:00.000Z'),
  deveTrocarSenha: false,
};

const tokenDe = (sub: string) => ({
  sub,
  email: `${sub}@clinica.test`,
  papel: Papel.PSICOLOGO,
  clinicaId: 'cli-A',
  jti: 'j',
  typ: 'access' as const,
});

// bracket notation: o enum ainda não tem o valor na fase Red (senão seria erro de compilação do arquivo todo)
const evento = (nome: string): string | undefined => (AuditEvent as unknown as Record<string, string>)[nome];

const requisicao = { headers: { 'user-agent': 'jest', 'x-forwarded-for': '203.0.113.7' }, ip: '10.0.0.1' };

describe('CRP na conta do usuário', () => {
  // RED 4
  // Passa "de graça" hoje: toPublicUser só espalha os campos e o cast esconde o tipo. A prova real do
  // Red do item 4 é o teste do schema Mongo abaixo (e o `crp` tipado em User no Green).
  it('User tem o campo crp e ele aparece no usuário público (passa de graça: só espalha campos)', () => {
    const publico = toPublicUser({ ...userBase, crp: '06/12345' } as User);
    expect((publico as unknown as { crp?: string }).crp).toBe('06/12345');
  });

  it('o schema Mongo do usuário persiste o campo crp, sem índice único', () => {
    const path = UserSchema.path('crp');
    expect(path).toBeDefined();
    expect((path as unknown as { options: { unique?: boolean } }).options.unique).toBeFalsy();
  });

  // RED 5
  describe('gravar o PRÓPRIO crp', () => {
    const makeController = () => {
      const authService = {
        atualizarMeuCrp: jest.fn().mockResolvedValue({ user: { ...userBase, crp: '06/12345' } }),
      };
      const controller = new AuthController(authService as never);
      return { controller, authService };
    };
    const atualizar = (c: AuthController, body: unknown, user: unknown) =>
      (c as unknown as { atualizarPerfil(b: unknown, u: unknown, r: unknown): Promise<unknown> }).atualizarPerfil(
        body,
        user,
        requisicao,
      );

    it('é PATCH /auth/me', () => {
      const handler = (AuthController.prototype as unknown as Record<string, () => unknown>).atualizarPerfil;
      expect(handler).toBeDefined();
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(4); // RequestMethod.PATCH
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('me');
    });

    it('grava o crp usando o id do TOKEN do chamador, com ip e user-agent para a auditoria', async () => {
      const { controller, authService } = makeController();

      await atualizar(controller, { crp: '06/12345' }, tokenDe('u1'));

      expect(authService.atualizarMeuCrp).toHaveBeenCalledWith('u1', '06/12345', {
        ip: '203.0.113.7',
        userAgent: 'jest',
      });
    });

    it('não grava o de outro usuário: um id no corpo é ignorado e o do token prevalece', async () => {
      const { controller, authService } = makeController();

      await atualizar(controller, { crp: '06/12345', userId: 'u2', id: 'u2' }, tokenDe('u1'));

      expect(authService.atualizarMeuCrp).toHaveBeenCalledTimes(1);
      expect(authService.atualizarMeuCrp.mock.calls[0][0]).toBe('u1');
      expect(authService.atualizarMeuCrp.mock.calls[0][1]).toBe('06/12345');
    });

    describe('serviço', () => {
      const contexto = { ip: '203.0.113.7', userAgent: 'jest' };
      const makeService = async (usuario: User | null) => {
        const { AuthService } = await import('../application/auth.service');
        const users = {
          findById: jest.fn().mockResolvedValue(usuario),
          update: jest.fn().mockResolvedValue({ ...usuario, crp: '06/12345' }),
        };
        const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
        const service = new AuthService(users as never, auditLogs as never, {} as never, {} as never, {} as never, {} as never);
        const atualizar = (id: string, crp: string) =>
          (service as unknown as {
            atualizarMeuCrp(i: string, c: string, ctx: unknown): Promise<unknown>;
          }).atualizarMeuCrp(id, crp, contexto);
        return { users, auditLogs, atualizar };
      };

      it('CRP vazio: grava só o crp do próprio usuário, uma vez, e audita USER_CRP_SET com o valor novo', async () => {
        const { users, auditLogs, atualizar } = await makeService(userBase);

        await atualizar('u1', '06/12345');

        expect(users.update).toHaveBeenCalledTimes(1);
        expect(users.update).toHaveBeenCalledWith('u1', { crp: '06/12345' });
        expect(auditLogs.create).toHaveBeenCalledTimes(1);
        expect(auditLogs.create).toHaveBeenCalledWith(
          expect.objectContaining({
            event: evento('USER_CRP_SET'),
            userId: 'u1',
            ip: '203.0.113.7',
            userAgent: 'jest',
            metadata: expect.objectContaining({ crpNovo: '06/12345' }),
          }),
        );
      });

      it('CRP já preenchido: 409 "CRP já definido; correção só pelo administrador", sem gravar nem auditar', async () => {
        const { users, auditLogs, atualizar } = await makeService({ ...userBase, crp: '06/99999' } as User);

        const falha = atualizar('u1', '06/12345');

        await expect(falha).rejects.toBeInstanceOf(ConflictException);
        await expect(falha).rejects.toThrow('CRP já definido; correção só pelo administrador');
        expect(users.update).not.toHaveBeenCalled();
        expect(auditLogs.create).not.toHaveBeenCalled();
      });

      it('mesmo valor reenviado também é 409 (a regra é "preenchido uma vez", não "valor diferente")', async () => {
        const { users, atualizar } = await makeService({ ...userBase, crp: '06/12345' } as User);

        await expect(atualizar('u1', '06/12345')).rejects.toBeInstanceOf(ConflictException);
        expect(users.update).not.toHaveBeenCalled();
      });
    });

    it('DTO: aceita só crp; campos como papel/clinicaId/id são rejeitados (ValidationPipe da app)', async () => {
      // caminho em variável: o módulo ainda não existe (Red), e assim só ESTE teste falha, não a suíte inteira
      const caminhoDto = '../application/dto/atualizar-perfil.dto';
      const { AtualizarPerfilDto } = await import(caminhoDto);
      const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
      const meta = { type: 'body' as const, metatype: AtualizarPerfilDto };

      await expect(pipe.transform({ crp: '06/12345' }, meta)).resolves.toMatchObject({ crp: '06/12345' });
      await expect(pipe.transform({ crp: '06/12345', papel: Papel.ADMIN }, meta)).rejects.toBeInstanceOf(BadRequestException);
      await expect(pipe.transform({ crp: '06/12345', id: 'u2' }, meta)).rejects.toBeInstanceOf(BadRequestException);
      await expect(pipe.transform({ crp: '' }, meta)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('DTO: faz trim, rejeita só espaços e limita o tamanho (sem regex de CRP)', async () => {
      const caminhoDto = '../application/dto/atualizar-perfil.dto';
      const { AtualizarPerfilDto } = await import(caminhoDto);
      const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
      const meta = { type: 'body' as const, metatype: AtualizarPerfilDto };

      await expect(pipe.transform({ crp: '  06/12345  ' }, meta)).resolves.toMatchObject({ crp: '06/12345' });
      await expect(pipe.transform({ crp: '   ' }, meta)).rejects.toBeInstanceOf(BadRequestException);
      await expect(pipe.transform({ crp: 'x'.repeat(41) }, meta)).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
