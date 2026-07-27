import { Papel } from '../../../../../../packages/shared/src/auth';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { EmbalagemProduto, Produto, ProjetoCatalogo, SexoProduto, TipoProduto } from '../../produtos/domain/produto.entity';
import { ProdutosService } from '../../produtos/application/produtos.service';
import { EntregaRepository } from './ports/entrega.repository';
import { EntregasService } from './entregas.service';
import { CreateEntregaDto } from './dto/create-entrega.dto';
import { OrigemEntrega } from '../domain/entrega.entity';

const user = {
  sub: 'enfermeiro-1',
  email: 'enfermeiro@nuvita.test',
  papel: Papel.ENFERMEIRO,
  clinicaId: 'clinica-1',
  jti: 'jti',
  typ: 'access' as const,
};

function produto(overrides: Partial<Produto>): Produto {
  return {
    id: 'produto-1',
    codigo: 100,
    nome: 'Produto',
    tipo: TipoProduto.CATETER_VAPRO,
    sexo: SexoProduto.UNIVERSAL,
    embalagem: EmbalagemProduto.STANDARD,
    projeto: ProjetoCatalogo.ALPHA,
    descricaoTecnica: '',
    ativo: true,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...overrides,
  };
}

function baseDto(codigo: number): CreateEntregaDto {
  return {
    pacienteId: 'paciente-1',
    dataEntrega: '2026-01-01',
    origem: OrigemEntrega.SUS,
    itens: [{ codigo, descricao: 'Item', quantidade: 2, valorUnitarioCentavos: 100, valorTotalCentavos: 200 }],
    valorTotalCentavos: 200,
  };
}

function serviceWith(repo: Record<string, jest.Mock>, buscarPorCodigo: jest.Mock) {
  return new EntregasService(
    repo as unknown as EntregaRepository,
    { avancarEtapaFluxo: jest.fn() } as unknown as PacientesService,
    { buscarPorCodigo } as unknown as ProdutosService,
  );
}

describe('EntregasService', () => {
  it('categoriza item de cateter (VAPRO) como sonda', async () => {
    const create = jest.fn().mockImplementation((data) => data);
    const buscarPorCodigo = jest.fn().mockResolvedValue(produto({ codigo: 100, tipo: TipoProduto.CATETER_VAPRO }));
    const service = serviceWith({ create }, buscarPorCodigo);

    const entrega = await service.create(baseDto(100), user);

    expect(entrega.itens[0].categoria).toBe('sonda');
  });

  it('categoriza item de coletor (ACTICOAT) como coletor', async () => {
    const create = jest.fn().mockImplementation((data) => data);
    const buscarPorCodigo = jest.fn().mockResolvedValue(produto({ codigo: 200, tipo: TipoProduto.COLETOR_ACTICOAT }));
    const service = serviceWith({ create }, buscarPorCodigo);

    const entrega = await service.create(baseDto(200), user);

    expect(entrega.itens[0].categoria).toBe('coletor');
  });

  it('não quebra e deixa sem categoria quando o código não corresponde a nenhum produto', async () => {
    const create = jest.fn().mockImplementation((data) => data);
    const buscarPorCodigo = jest.fn().mockResolvedValue(null);
    const service = serviceWith({ create }, buscarPorCodigo);

    const entrega = await service.create(baseDto(999), user);

    expect(entrega.itens[0].categoria).toBeUndefined();
  });
});
