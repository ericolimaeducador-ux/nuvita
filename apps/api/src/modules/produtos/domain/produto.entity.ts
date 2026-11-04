// Catálogo OPERACIONAL de produtos (insumos entregues ao paciente). Sem e-commerce: nada de preço de venda online,
// checkout ou carteira (isso é da landing, etapa 4).
//
// TENANCY: o catálogo é GLOBAL (sem clinicaId), igual ao Nuvita antigo. Se no futuro cada clínica precisar do seu
// próprio catálogo, isso é uma decisão a tomar (clinicaId no schema + índice único {clinicaId, codigo}); hoje todas as
// clínicas enxergam o mesmo catálogo e só ADMIN/SUPER_ADMIN o alteram.
//
// TODO(conteudo): os valores dos enums abaixo (marcas, "sonda", "coletor") são do catálogo de incontinência urinária
// e ficam como estão porque os dados já gravados usam esses valores. Revisar/ampliar na etapa de conteúdo
// (estomaterapia: bolsas, barreiras, etc.).
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

// Classificação interna de projeto (mesmos rótulos neutros de ProjetoPaciente, definida localmente para manter o
// domínio de produtos autocontido). Vincula cada item do catálogo ao projeto ao qual ele pode ser indicado.
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
