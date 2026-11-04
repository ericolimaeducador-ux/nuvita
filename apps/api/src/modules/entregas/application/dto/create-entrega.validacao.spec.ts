import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateEntregaDto } from './create-entrega.dto';

// Itens da entrega são validados um a um (o antigo só checava "é array": qualquer lixo passava).
const base = {
  pacienteId: '6addf106f1ed2961f5111e68',
  dataEntrega: '2026-01-01',
  origem: 'sus',
  itens: [{ codigo: 100, descricao: 'Item', quantidade: 2, valorUnitarioCentavos: 100, valorTotalCentavos: 200 }],
  valorTotalCentavos: 200,
};
const opcoes = { whitelist: true, forbidNonWhitelisted: true };
const erros = async (over: Record<string, unknown>) =>
  (await validate(plainToInstance(CreateEntregaDto, { ...base, ...over }), opcoes)).map((e) => e.property);

describe('CreateEntregaDto', () => {
  it('entrega válida é aceita', async () => {
    expect(await erros({})).toEqual([]);
  });

  it.each([
    ['pacienteId que não é ObjectId', { pacienteId: 'abc' }, 'pacienteId'],
    ['origem fora do enum', { origem: 'outra' }, 'origem'],
    ['sem itens', { itens: [] }, 'itens'],
    ['item sem descrição', { itens: [{ ...base.itens[0], descricao: undefined }] }, 'itens'],
    ['quantidade zero', { itens: [{ ...base.itens[0], quantidade: 0 }] }, 'itens'],
    ['valor em centavos fracionado', { itens: [{ ...base.itens[0], valorUnitarioCentavos: 10.5 }] }, 'itens'],
    ['valor negativo', { valorTotalCentavos: -1 }, 'valorTotalCentavos'],
    ['categoria enviada pelo cliente (é derivada no servidor)', { itens: [{ ...base.itens[0], categoria: 'sonda' }] }, 'itens'],
    ['campo desconhecido', { status: 'entregue' }, 'status'],
  ])('%s: recusado', async (_nome, over, campo) => {
    expect(await erros(over)).toContain(campo);
  });
});
