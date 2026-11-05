import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ListProdutosQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  tipo?: string;

  /** Só ADMIN/SUPER_ADMIN enxergam inativos (a tela de gestão do catálogo). */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  incluirInativos?: boolean;
}
