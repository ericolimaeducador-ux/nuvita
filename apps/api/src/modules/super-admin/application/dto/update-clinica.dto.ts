import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PlanoClinica } from '../../../clinicas/domain/clinica.entity';

export class UpdateClinicaDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nome?: string;

  @IsOptional()
  @IsEnum(PlanoClinica)
  plano?: PlanoClinica;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
