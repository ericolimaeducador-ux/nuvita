import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { ROLES_KEY } from '../../auth/presentation/decorators/roles.decorator';
import { InscricoesTesteController } from './inscricoes-teste.controller';

const proto = InscricoesTesteController.prototype;
const guardas = (metodo: keyof InscricoesTesteController) => Reflect.getMetadata(GUARDS_METADATA, proto[metodo]) ?? [];
const papeis = (metodo: keyof InscricoesTesteController) => Reflect.getMetadata(ROLES_KEY, proto[metodo]);

describe('InscricoesTesteController — superfície de acesso', () => {
  it('POST (landing pública) não exige login e não tem guards de autenticação', () => {
    expect(guardas('criar')).toHaveLength(0);
    expect(Reflect.getMetadata(GUARDS_METADATA, InscricoesTesteController) ?? []).toHaveLength(0);
  });

  it.each(['listar', 'atualizarStatus'] as const)('%s exige JWT + gates + papel SUPER_ADMIN', (metodo) => {
    expect(guardas(metodo)).toHaveLength(3);
    expect(papeis(metodo)).toEqual([Papel.SUPER_ADMIN]);
  });
});
