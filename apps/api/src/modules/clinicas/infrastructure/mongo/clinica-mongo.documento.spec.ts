import { TipoDocumentoFiscal } from '../../../../../../../packages/shared/src/documentos';
import { ClinicaMongoRepository } from './clinica-mongo.repository';

// Sem migração de índice: o índice único de `cnpj` já existe em produção e não é esparso, então "sem documento"
// grava um valor único SEM-DOCUMENTO-<id>. O repositório devolve documento vazio e a gravação única casa esse prefixo.
const objectId = '6addf7a498eae6c5fd7e9dda';
const doc = (cnpj: string) => ({
  toObject: () => ({ _id: { toString: () => objectId }, nome: 'C', cnpj, plano: 'basico', configuracoes: {}, ativo: true, criadoEm: new Date() }),
});

describe('ClinicaMongoRepository — documento fiscal no primeiro uso', () => {
  it('create sem documento: grava um valor único com o prefixo e devolve documento vazio', async () => {
    const create = jest.fn(async (i: { cnpj: string }) => doc(i.cnpj));
    const repo = new ClinicaMongoRepository({ create } as never);
    const clinica = await repo.create({ nome: 'C', plano: 'basico', configuracoes: {} } as never);
    expect(create.mock.calls[0][0].cnpj).toMatch(/^SEM-DOCUMENTO-[0-9a-f-]+$/);
    expect(clinica.documento).toBe('');
  });

  it('duas clínicas sem documento recebem valores diferentes (o índice único não colide)', async () => {
    const create = jest.fn(async (i: { cnpj: string }) => doc(i.cnpj));
    const repo = new ClinicaMongoRepository({ create } as never);
    await repo.create({ nome: 'A', plano: 'basico', configuracoes: {} } as never);
    await repo.create({ nome: 'B', plano: 'basico', configuracoes: {} } as never);
    expect(create.mock.calls[0][0].cnpj).not.toBe(create.mock.calls[1][0].cnpj);
  });

  it('preencherDocumentoSeVazio: o filtro do update exige o prefixo (atômico) e grava normalizado', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(doc('52998224725')) });
    const repo = new ClinicaMongoRepository({ findOneAndUpdate } as never);
    await repo.preencherDocumentoSeVazio(objectId, '529.982.247-25', TipoDocumentoFiscal.CPF);
    const [filtro, update] = findOneAndUpdate.mock.calls[0];
    expect(String(filtro._id)).toBe(objectId);
    expect(filtro.cnpj).toEqual({ $regex: '^SEM-DOCUMENTO-' });
    expect(update).toEqual({ $set: { cnpj: '52998224725', tipoDocumento: TipoDocumentoFiscal.CPF } });
  });

  it('já preenchido (nenhum documento casou o filtro): devolve null', async () => {
    const findOneAndUpdate = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    const repo = new ClinicaMongoRepository({ findOneAndUpdate } as never);
    await expect(repo.preencherDocumentoSeVazio(objectId, '52998224725', TipoDocumentoFiscal.CPF)).resolves.toBeNull();
  });
});
