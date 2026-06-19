import { IsArray, IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class ProdutoSolicitadoDto {
  @IsNumber() codigo!: number;
  @IsString() descricao!: string;
  @IsNumber() quantidade!: number;
  @IsString() unidade!: string;
  @IsOptional() @IsNumber() codigoSiafisico?: number;
}

export class CreateLaudoMedicoDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsString() pacienteId!: string;
  @IsString() avaliacaoIuId!: string;
  @IsDateString() dataLaudo!: string;
  @IsArray() @IsString({ each: true }) cid10!: string[];
  @IsString() justificativaMedica!: string;
  @IsString() fundamentoLegal!: string;
  @IsArray() produtosSolicitados!: ProdutoSolicitadoDto[];
  @IsOptional() @IsString() crmNumero?: string;
}
