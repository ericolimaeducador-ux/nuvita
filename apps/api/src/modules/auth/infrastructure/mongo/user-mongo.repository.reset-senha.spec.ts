import { UserMongoRepository } from './user-mongo.repository';

// Invalidação do token de reset: qualquer caminho que troque a senha (reset do super-admin, troca
// obrigatória, o próprio reset) apaga o token pendente, porque todos passam por update({passwordHash}).
function criar() {
  const exec = jest.fn().mockResolvedValue({
    toObject: () => ({
      _id: { toString: () => 'u1' }, nome: 'F', email: 'f@x.test', passwordHash: 'h', papel: 'ADMIN', ativo: true,
      criadoEm: new Date(), deveTrocarSenha: false,
    }),
  });
  const model = {
    findByIdAndUpdate: jest.fn().mockReturnValue({ exec }),
    findOneAndUpdate: jest.fn().mockReturnValue({ select: () => ({ exec }), exec }),
  };
  return { repo: new UserMongoRepository(model as never), model };
}

describe('UserMongoRepository – token de reset de senha', () => {
  it('update com passwordHash apaga o token pendente (qualquer caminho invalida o link)', async () => {
    const { repo, model } = criar();
    await repo.update('u1', { passwordHash: 'novo' });
    const [, update] = model.findByIdAndUpdate.mock.calls[0];
    expect(update.$unset).toEqual({ resetSenha: '' });
  });

  it('update sem passwordHash não mexe no token', async () => {
    const { repo, model } = criar();
    await repo.update('u1', { nome: 'Outro' });
    const [, update] = model.findByIdAndUpdate.mock.calls[0];
    expect(update.$unset).toBeUndefined();
  });

  it('salvarResetSenha grava só o hash e a expiração', async () => {
    const { repo, model } = criar();
    const expiraEm = new Date('2026-10-23T12:00:00Z');
    await repo.salvarResetSenha('u1', 'hash-do-token', expiraEm);
    const [, update] = model.findByIdAndUpdate.mock.calls[0];
    expect(update).toEqual({ $set: { resetSenha: { tokenHash: 'hash-do-token', expiraEm } } });
  });

  it('redefinirSenhaComToken é atômico: casa hash + validade + conta ativa, troca a senha, apaga o token e revoga sessões', async () => {
    const { repo, model } = criar();
    const agora = new Date('2026-10-23T12:00:00Z');
    await repo.redefinirSenhaComToken('hash-do-token', 'hash-senha', agora);
    const [filtro, update] = model.findOneAndUpdate.mock.calls[0];
    expect(filtro).toEqual({
      'resetSenha.tokenHash': 'hash-do-token', 'resetSenha.expiraEm': { $gt: agora }, ativo: true,
    });
    expect(update.$set).toEqual(
      expect.objectContaining({ passwordHash: 'hash-senha', deveTrocarSenha: false, tokensValidosApartirDe: agora }),
    );
    expect(update.$set).not.toHaveProperty('2faSecret');
    expect(update.$unset).toEqual({ resetSenha: '' });
  });
});
