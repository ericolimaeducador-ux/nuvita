import { TipoDocumentoFiscal } from '../../../../../../../packages/shared/src/documentos';
import { ClinicaMongoRepository } from './clinica-mongo.repository';

// Condição (a) do sentinela: TODA leitura do repositório devolve documento vazio para SEM-DOCUMENTO-<id>, nunca o prefixo.
const SENTINELA = 'SEM-DOCUMENTO-3f2b6c1e-0000-4000-8000-000000000001';
const objectId = '6addf7a498eae6c5fd7e9dda';
const doc = (cnpj: string) => ({
  toObject: () => ({ _id: { toString: () => objectId }, nome: 'Clínica da Claudia', cnpj, plano: 'basico', configuracoes: {}, ativo: true, criadoEm: new Date() }),
});
const exec = (valor: unknown) => ({ exec: jest.fn().mockResolvedValue(valor) });
const semPrefixo = (valor: unknown) => expect(JSON.stringify(valor)).not.toContain('SEM-DOCUMENTO');

describe('ClinicaMongoRepository — o sentinela nunca sai pelas leituras', () => {
  it('findById', async () => {
    const repo = new ClinicaMongoRepository({ findById: jest.fn().mockReturnValue(exec(doc(SENTINELA))) } as never);
    const c = await repo.findById(objectId);
    expect(c?.documento).toBe('');
    semPrefixo(c);
  });

  it('findAll (lista do super-admin)', async () => {
    const find = jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue(exec([doc(SENTINELA), doc('52998224725')])) });
    const repo = new ClinicaMongoRepository({ find } as never);
    const todas = await repo.findAll();
    expect(todas.map((c) => c.documento)).toEqual(['', '52998224725']);
    semPrefixo(todas);
  });

  it('findByDocumento: um documento que se pareça com o sentinela nunca o encontra (a normalização tira os hífens)', async () => {
    const findOne = jest.fn().mockReturnValue(exec(null));
    const repo = new ClinicaMongoRepository({ findOne } as never);
    await repo.findByDocumento('SEM-DOCUMENTO-3f2b6c1e-0000-4000-8000-000000000001');
    expect(findOne.mock.calls[0][0].cnpj).not.toMatch(/^SEM-DOCUMENTO-/);
  });

  it('update (detalhe/edição do super-admin)', async () => {
    const findByIdAndUpdate = jest.fn().mockReturnValue(exec(doc(SENTINELA)));
    const repo = new ClinicaMongoRepository({ findByIdAndUpdate } as never);
    const c = await repo.update(objectId, { nome: 'Novo nome' });
    expect(c?.documento).toBe('');
    semPrefixo(c);
  });

  it('preencherDocumentoSeVazio devolve o documento novo, não o prefixo', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue(exec(doc('52998224725')));
    const repo = new ClinicaMongoRepository({ findOneAndUpdate } as never);
    const c = await repo.preencherDocumentoSeVazio(objectId, '529.982.247-25', TipoDocumentoFiscal.CPF);
    expect(c?.documento).toBe('52998224725');
    semPrefixo(c);
  });
});

describe('ClinicaMongoRepository.update — nunca limpa o documento nem grava vazio', () => {
  it('restaurar "sem documento" (compensação do super-admin) grava um NOVO sentinela, não string vazia', async () => {
    const findByIdAndUpdate = jest.fn().mockReturnValue(exec(doc(SENTINELA)));
    const repo = new ClinicaMongoRepository({ findByIdAndUpdate } as never);
    await repo.update(objectId, { documento: '', tipoDocumento: TipoDocumentoFiscal.CNPJ });
    const [, operacao] = findByIdAndUpdate.mock.calls[0];
    expect(operacao.$set.cnpj).toMatch(/^SEM-DOCUMENTO-[0-9a-f-]+$/);
    expect(operacao.$set.cnpj).not.toBe('');
  });

  it('um documento informado continua sendo gravado normalizado', async () => {
    const findByIdAndUpdate = jest.fn().mockReturnValue(exec(doc('52998224725')));
    const repo = new ClinicaMongoRepository({ findByIdAndUpdate } as never);
    await repo.update(objectId, { documento: '529.982.247-25', tipoDocumento: TipoDocumentoFiscal.CPF });
    expect(findByIdAndUpdate.mock.calls[0][1].$set.cnpj).toBe('52998224725');
  });
});
