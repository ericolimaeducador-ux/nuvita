import { Papel } from '../../../../../../../packages/shared/src/auth';
import { UserMongoRepository } from './user-mongo.repository';

/**
 * Fase 4 (feature-session-revocation-on-password-change): tokensValidosApartirDe
 * precisa ir e voltar do Mongo real — update() tem que incluir o campo no $set
 * quando fornecido, e toEntity() tem que trazê-lo de volta ao ler o documento.
 * Sem mongodb-memory-server no projeto: Model é mockado (mesmo nível de unidade
 * já usado nos outros specs deste módulo), sem round-trip de banco real.
 */
function makeRepository() {
  const execFindByIdAndUpdate = jest.fn();
  const execFindById = jest.fn();

  const userModel = {
    findByIdAndUpdate: jest.fn().mockReturnValue({ exec: execFindByIdAndUpdate }),
    findById: jest.fn().mockReturnValue({ exec: execFindById }),
  };

  const repository = new UserMongoRepository(userModel as never);
  return { repository, userModel, execFindByIdAndUpdate, execFindById };
}

function makeRawDoc(overrides: Record<string, unknown> = {}) {
  const base = {
    _id: { toString: () => 'u1' },
    nome: 'Fulana',
    email: 'fulana@nuvita.test',
    passwordHash: 'hash',
    papel: Papel.PSICOLOGO,
    clinicaId: 'c1',
    ativo: true,
    criadoEm: new Date('2026-09-10T00:00:00.000Z'),
    deveTrocarSenha: false,
    termosAceitos: undefined,
    modulosConcedidos: undefined,
    modulosRevogados: undefined,
    ...overrides,
  };
  return { toObject: () => base };
}

describe('UserMongoRepository — tokensValidosApartirDe (Fase 4)', () => {
  it('update() inclui tokensValidosApartirDe no $set quando fornecido', async () => {
    const { repository, userModel, execFindByIdAndUpdate } = makeRepository();
    execFindByIdAndUpdate.mockResolvedValue(makeRawDoc());

    const stamp = new Date('2026-09-12T12:00:00.000Z');
    await repository.update('u1', { tokensValidosApartirDe: stamp });

    expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'u1',
      { $set: expect.objectContaining({ tokensValidosApartirDe: stamp }) },
      { new: true },
    );
  });

  it('toEntity() mapeia tokensValidosApartirDe do documento lido de volta pro domínio', async () => {
    const { repository, execFindById } = makeRepository();
    const stamp = new Date('2026-09-12T12:00:00.000Z');
    execFindById.mockResolvedValue(makeRawDoc({ tokensValidosApartirDe: stamp }));

    const user = await repository.findById('u1');

    expect(user?.tokensValidosApartirDe).toEqual(stamp);
  });

  it('toEntity() mantém tokensValidosApartirDe ausente quando o documento não tem o campo (regressão)', async () => {
    const { repository, execFindById } = makeRepository();
    execFindById.mockResolvedValue(makeRawDoc());

    const user = await repository.findById('u1');

    expect(user?.tokensValidosApartirDe).toBeUndefined();
  });
});
