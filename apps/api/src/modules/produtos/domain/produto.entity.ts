export enum TipoProduto {
  CATETER_VAPRO = 'cateter_vapro',
  COLETOR_ACTICOAT = 'coletor_acticoat',
}

export enum SexoProduto {
  MASCULINO = 'masculino',
  FEMININO = 'feminino',
  UNIVERSAL = 'universal',
}

export enum EmbalagemProduto {
  STANDARD = 'standard',
  POCKET = 'pocket',
}

export interface Produto {
  id: string;
  codigo: number;
  nome: string;
  tipo: TipoProduto;
  sexo: SexoProduto;
  embalagem: EmbalagemProduto;
  french?: number;
  comprimentoCm?: number;
  descricaoTecnica: string;
  descricaoSiafisico?: string;
  codigoSiafisico?: number;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}
