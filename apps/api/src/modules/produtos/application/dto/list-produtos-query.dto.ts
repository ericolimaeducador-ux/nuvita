import { Transform } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { TipoProduto } from '../../domain/produto.entity';

export class ListProdutosQueryDto {
  @IsOptional()
  @IsEnum(TipoProduto)
  tipo?: TipoProduto;

  /** Só ADMIN/SUPER_ADMIN enxergam inativos (a tela de gestão do catálogo). */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  incluirInativos?: boolean;
}
