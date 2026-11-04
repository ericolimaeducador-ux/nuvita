import { Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import { InscricaoTesteDocument } from './inscricao-teste.schema';
import { InscricaoTesteMongoRepository } from './inscricao-teste-mongo.repository';

const nova = {
  nome: 'Maria Souza',
  email: 'maria@example.com',
  whatsapp: '(11) 90000-0000',
  crpNumero: '06/00000',
  cidadeEstado: 'São Paulo, SP',
  modoAtendimento: 'Online',
  termoVersao: 'teste-beta-v1-2026-10',
  aceiteTermoEm: new Date(),
  aceiteIp: '127.0.0.1',
  aceiteUserAgent: 'jest',
};

function repoQueFalhaCom(erro: unknown) {
  const model = { create: jest.fn().mockRejectedValue(erro) } as unknown as Model<InscricaoTesteDocument>;
  return new InscricaoTesteMongoRepository(model);
}

describe('InscricaoTesteMongoRepository.criar — chave duplicada', () => {
  let logError: jest.SpyInstance;
  beforeEach(() => {
    logError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => logError.mockRestore());

  it('colisão no índice de email: devolve null (e-mail repetido), sem log de erro', async () => {
    const repo = repoQueFalhaCom({ code: 11000, keyPattern: { email: 1 } });
    await expect(repo.criar(nova)).resolves.toBeNull();
    expect(logError).not.toHaveBeenCalled();
  });

  it('colisão em outro índice único: registra erro grave e lança (não engole)', async () => {
    const erro = { code: 11000, keyPattern: { '{ "email": 1 }': 1 } };
    const repo = repoQueFalhaCom(erro);
    await expect(repo.criar(nova)).rejects.toBe(erro);
    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError.mock.calls[0][0]).toContain('email_1');
    expect(logError.mock.calls[0][0]).not.toContain('maria@example.com');
  });

  it('11000 sem keyPattern: registra erro e lança', async () => {
    const erro = { code: 11000 };
    await expect(repoQueFalhaCom(erro).criar(nova)).rejects.toBe(erro);
    expect(logError).toHaveBeenCalledTimes(1);
  });

  it('outros erros do banco: lança sem tratar como duplicata', async () => {
    const erro = new Error('timeout');
    await expect(repoQueFalhaCom(erro).criar(nova)).rejects.toBe(erro);
    expect(logError).not.toHaveBeenCalled();
  });
});
