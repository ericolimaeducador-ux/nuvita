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

  /** Desmarcar no lançamento: todos os usuários da clínica passam a aceitar os Termos de Uso. */
  @IsOptional()
  @IsBoolean()
  faseTeste?: boolean;
}
