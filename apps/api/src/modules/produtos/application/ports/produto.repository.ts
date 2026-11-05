import { Produto } from '../../domain/produto.entity';

export type CreateProdutoInput = Omit<Produto, 'id' | 'ativo' | 'criadoEm' | 'atualizadoEm'>;
export type UpdateProdutoInput = Partial<Omit<Produto, 'id' | 'codigo' | 'ativo' | 'criadoEm' | 'atualizadoEm'>>;

export interface ProdutoRepository {
  findByCodigo(codigo: number): Promise<Produto | null>;
  /** `ativo` indefinido = todos (ativos e inativos). */
  findAll(tipo?: string, ativo?: boolean): Promise<Produto[]>;
  create(data: CreateProdutoInput): Promise<Produto>;
  update(codigo: number, data: UpdateProdutoInput): Promise<Produto | null>;
  /** Remoção lógica: o produto continua existindo (entregas antigas referenciam o código). */
  deactivate(codigo: number): Promise<Produto | null>;
}
