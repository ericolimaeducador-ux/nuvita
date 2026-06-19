import { Produto, TipoProduto } from '../../domain/produto.entity';

export interface ProdutoRepository {
  findByCodigo(codigo: number): Promise<Produto | null>;
  findAll(tipo?: TipoProduto, ativo?: boolean): Promise<Produto[]>;
  create(data: Omit<Produto, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<Produto>;
  upsertByCodigo(data: Omit<Produto, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<Produto>;
}
