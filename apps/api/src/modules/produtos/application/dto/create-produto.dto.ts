import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { EmbalagemProduto, ProjetoCatalogo, SexoProduto } from '../../domain/produto.entity';

export class CreateProdutoDto {
  /** Código do catálogo (único). */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  codigo!: number;

  @IsOptional()
  @IsString()
  codigoFabricante?: string;

  @IsString()
  @IsNotEmpty()
  nome!: string;

  /** Tipo/linha do produto: texto livre, não-vazio, sem espaços nas pontas (ex.: cateter_vapro). */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  tipo!: string;

  @IsEnum(SexoProduto)
  sexo!: SexoProduto;

  @IsEnum(EmbalagemProduto)
  embalagem!: EmbalagemProduto;

  @IsEnum(ProjetoCatalogo)
  projeto!: ProjetoCatalogo;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  french?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  comprimentoCm?: number;

  @IsString()
  @IsNotEmpty()
  descricaoTecnica!: string;

  @IsOptional()
  @IsString()
  descricaoSiafisico?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  codigoSiafisico?: number;
}
