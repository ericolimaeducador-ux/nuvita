export enum TipoProduto {
  CATETER_VAPRO = 'cateter_vapro',
  COLETOR_ACTICOAT = 'coletor_acticoat',
  CATETER_SAMTRONIC = 'cateter_samtronic',
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

// Classificação interna de projeto (mesmos rótulos neutros de ProjetoPaciente,
// definida localmente para manter o domínio de produtos autocontido). Vincula
// cada item do catálogo ao projeto do paciente ao qual ele pode ser indicado.
export enum ProjetoCatalogo {
  ALPHA = 'ALPHA',
  BETA = 'BETA',
}

export interface Produto {
  id: string;
  codigo: number;
  codigoFabricante?: string;
  nome: string;
  tipo: TipoProduto;
  sexo: SexoProduto;
  embalagem: EmbalagemProduto;
  projeto: ProjetoCatalogo;
  french?: number;
  comprimentoCm?: number;
  descricaoTecnica: string;
  descricaoSiafisico?: string;
  codigoSiafisico?: number;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}
