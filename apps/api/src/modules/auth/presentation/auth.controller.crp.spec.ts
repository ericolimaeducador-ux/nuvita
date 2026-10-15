import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { toPublicUser, User } from '../domain/user.entity';
import { UserSchema } from '../infrastructure/mongo/user.schema';
import { AuthController } from './auth.controller';

/**
 * CRP na conta do usuário (feature-timbre-clinico-dinamico, PR 1 backend).
 * Não existia endpoint de self-update: o mínimo é PATCH /auth/me, que SÓ aceita `crp`.
 * Contratos novos assumidos (não existem hoje):
 *   User.crp?: string  /  UserSchema com o path `crp`
 *   AuthService.atualizarMeuCrp(userId, crp): Promise<{ user: PublicUser }>
 *   AuthController.atualizarPerfil(dto: AtualizarPerfilDto, user)  — @Patch('me')
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

describe('CRP na conta do usuário', () => {
  // RED 4
  // Passa "de graça" hoje: toPublicUser só espalha os campos e o cast esconde o tipo. A prova real do
  // Red do item 4 é o teste do schema Mongo abaixo (e o `crp` tipado em User no Green).
  it('User tem o campo crp e ele aparece no usuário público (passa de graça: só espalha campos)', () => {
    const publico = toPublicUser({ ...userBase, crp: '06/12345' } as User);
    expect((publico as unknown as { crp?: string }).crp).toBe('06/12345');
  });

  it('o schema Mongo do usuário persiste o campo crp', () => {
    expect(UserSchema.path('crp')).toBeDefined();
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
      (c as unknown as { atualizarPerfil(b: unknown, u: unknown): Promise<unknown> }).atualizarPerfil(body, user);

    it('é PATCH /auth/me', () => {
      const handler = (AuthController.prototype as unknown as Record<string, () => unknown>).atualizarPerfil;
      expect(handler).toBeDefined();
      expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(4); // RequestMethod.PATCH
      expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe('me');
    });

    it('grava o crp usando o id do TOKEN do chamador', async () => {
      const { controller, authService } = makeController();

      await atualizar(controller, { crp: '06/12345' }, tokenDe('u1'));

      expect(authService.atualizarMeuCrp).toHaveBeenCalledWith('u1', '06/12345');
    });

    it('não grava o de outro usuário: um id no corpo é ignorado e o do token prevalece', async () => {
      const { controller, authService } = makeController();

      await atualizar(controller, { crp: '06/12345', userId: 'u2', id: 'u2' }, tokenDe('u1'));

      expect(authService.atualizarMeuCrp).toHaveBeenCalledTimes(1);
      expect(authService.atualizarMeuCrp).toHaveBeenCalledWith('u1', '06/12345');
    });

    it('serviço: atualiza só o crp do próprio usuário no repositório', async () => {
      const { AuthService } = await import('../application/auth.service');
      const users = { update: jest.fn().mockResolvedValue({ ...userBase, crp: '06/12345' }) };
      const service = new AuthService(users as never, {} as never, {} as never, {} as never, {} as never, {} as never);

      await (service as unknown as { atualizarMeuCrp(id: string, crp: string): Promise<unknown> }).atualizarMeuCrp(
        'u1',
        '06/12345',
      );

      expect(users.update).toHaveBeenCalledTimes(1);
      expect(users.update).toHaveBeenCalledWith('u1', { crp: '06/12345' });
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
  });
});
