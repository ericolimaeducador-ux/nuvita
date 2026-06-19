import { Inject, Injectable } from '@nestjs/common';
import { EmbalagemProduto, Produto, SexoProduto, TipoProduto } from '../domain/produto.entity';
import { PRODUTO_REPOSITORY } from '../produtos.constants';
import { ProdutoRepository } from './ports/produto.repository';

const V = TipoProduto.CATETER_VAPRO;
const A = TipoProduto.COLETOR_ACTICOAT;
const M = SexoProduto.MASCULINO;
const F = SexoProduto.FEMININO;
const S = EmbalagemProduto.STANDARD;
const P = EmbalagemProduto.POCKET;

const CATALOGO: Omit<Produto, 'id' | 'criadoEm' | 'atualizadoEm'>[] = [
  { codigo: 72082, nome: 'VaPro Feminino 08Fr Standard', tipo: V, sexo: F, embalagem: S, french: 8, comprimentoCm: 20, descricaoTecnica: 'Cateter uretral hidrofílico TPE feminino pediátrico, 20cm, 08Fr.', descricaoSiafisico: 'CATETER INTERMITENTE HIDROFÍLICO FEMININO PEDIÁTRICO, EM ELASTÔMERO TERMOPLÁSTICO (TPE), SEM FTALATOS, ESTÉRIL, 20CM, 08FR, DE USO ÚNICO', ativo: true },
  { codigo: 72102, nome: 'VaPro Feminino 10Fr Standard', tipo: V, sexo: F, embalagem: S, french: 10, comprimentoCm: 20, descricaoTecnica: 'Cateter uretral hidrofílico TPE feminino, 20cm, 10Fr.', descricaoSiafisico: 'CATETER INTERMITENTE HIDROFÍLICO FEMININO, EM ELASTÔMERO TERMOPLÁSTICO (TPE), SEM FTALATOS, ESTÉRIL, 20CM, 10FR, DE USO ÚNICO', ativo: true },
  { codigo: 72122, nome: 'VaPro Feminino 12Fr Standard', tipo: V, sexo: F, embalagem: S, french: 12, comprimentoCm: 20, descricaoTecnica: 'Cateter uretral hidrofílico TPE feminino, 20cm, 12Fr.', descricaoSiafisico: 'CATETER INTERMITENTE HIDROFÍLICO FEMININO, EM ELASTÔMERO TERMOPLÁSTICO (TPE), SEM FTALATOS, ESTÉRIL, 20CM, 12FR, DE USO ÚNICO', ativo: true },
  { codigo: 72142, nome: 'VaPro Feminino 14Fr Standard', tipo: V, sexo: F, embalagem: S, french: 14, comprimentoCm: 20, descricaoTecnica: 'Cateter uretral hidrofílico TPE feminino, 20cm, 14Fr.', ativo: true },
  { codigo: 72084, nome: 'VaPro Masculino 08Fr Standard', tipo: V, sexo: M, embalagem: S, french: 8, comprimentoCm: 40, descricaoTecnica: 'Cateter uretral hidrofílico TPE masculino pediátrico, 40cm, 08Fr.', ativo: true },
  { codigo: 72104, nome: 'VaPro Masculino 10Fr Standard', tipo: V, sexo: M, embalagem: S, french: 10, comprimentoCm: 40, descricaoTecnica: 'Cateter uretral hidrofílico TPE masculino, 40cm, 10Fr.', descricaoSiafisico: 'CATETER INTERMITENTE HIDROFÍLICO MASCULINO, EM ELASTÔMERO TERMOPLÁSTICO (TPE), SEM FTALATOS, ESTÉRIL, 40CM, 10FR, DE USO ÚNICO', ativo: true },
  { codigo: 72124, nome: 'VaPro Masculino 12Fr Standard', tipo: V, sexo: M, embalagem: S, french: 12, comprimentoCm: 40, descricaoTecnica: 'Cateter uretral hidrofílico TPE masculino, 40cm, 12Fr.', descricaoSiafisico: 'CATETER INTERMITENTE HIDROFÍLICO MASCULINO, EM ELASTÔMERO TERMOPLÁSTICO (TPE), SEM FTALATOS, ESTÉRIL, 40CM, 12FR, DE USO ÚNICO', ativo: true },
  { codigo: 72144, nome: 'VaPro Masculino 14Fr Standard', tipo: V, sexo: M, embalagem: S, french: 14, comprimentoCm: 40, descricaoTecnica: 'Cateter uretral hidrofílico TPE masculino, 40cm, 14Fr.', ativo: true },
  { codigo: 72164, nome: 'VaPro Masculino 16Fr Standard', tipo: V, sexo: M, embalagem: S, french: 16, comprimentoCm: 40, descricaoTecnica: 'Cateter uretral hidrofílico TPE masculino, 40cm, 16Fr.', ativo: true },
  { codigo: 70104, nome: 'VaPro Masculino 10Fr Pocket', tipo: V, sexo: M, embalagem: P, french: 10, comprimentoCm: 40, descricaoTecnica: 'Cateter uretral hidrofílico TPE masculino pocket, 40cm, 10Fr.', ativo: true },
  { codigo: 70124, nome: 'VaPro Masculino 12Fr Pocket', tipo: V, sexo: M, embalagem: P, french: 12, comprimentoCm: 40, descricaoTecnica: 'Cateter uretral hidrofílico TPE masculino pocket, 40cm, 12Fr.', ativo: true },
  { codigo: 4714598, nome: 'ACTICOAT Extended Wear Pequeno 22-25mm', tipo: A, sexo: M, embalagem: S, descricaoTecnica: 'Dispositivo masculino para incontinência urinária em látex, autoadesivo. Tamanho pequeno 22-25mm.', codigoSiafisico: 9206, ativo: true },
  { codigo: 4714601, nome: 'ACTICOAT Extended Wear Médio 26-30mm', tipo: A, sexo: M, embalagem: S, descricaoTecnica: 'Dispositivo masculino para incontinência urinária em látex, autoadesivo. Tamanho médio 26-30mm.', codigoSiafisico: 9207, ativo: true },
  { codigo: 4714610, nome: 'ACTICOAT Extended Wear Grande 31-35mm', tipo: A, sexo: M, embalagem: S, descricaoTecnica: 'Dispositivo masculino para incontinência urinária em látex, autoadesivo. Tamanho grande 31-35mm.', codigoSiafisico: 9208, ativo: true },
  { codigo: 4714628, nome: 'ACTICOAT Extended Wear Extra Grande 36-39mm', tipo: A, sexo: M, embalagem: S, descricaoTecnica: 'Dispositivo masculino para incontinência urinária em látex, autoadesivo. Tamanho extra grande 36-39mm.', codigoSiafisico: 9209, ativo: true },
];

@Injectable()
export class ProdutosService {
  constructor(@Inject(PRODUTO_REPOSITORY) private readonly produtos: ProdutoRepository) {}

  async seedCatalogo(): Promise<void> {
    for (const produto of CATALOGO) {
      await this.produtos.upsertByCodigo(produto);
    }
  }

  async listar(tipo?: TipoProduto): Promise<Produto[]> {
    return this.produtos.findAll(tipo, true);
  }

  async buscarPorCodigo(codigo: number): Promise<Produto | null> {
    return this.produtos.findByCodigo(codigo);
  }
}
