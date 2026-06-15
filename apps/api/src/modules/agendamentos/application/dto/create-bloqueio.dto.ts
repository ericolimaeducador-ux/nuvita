import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateBloqueioDto {
  @IsOptional()
  @IsString()
  clinicaId?: string;

  @IsString()
  medicoId!: string;

  @IsDateString()
  dataHoraInicio!: string;

  @IsDateString()
  dataHoraFim!: string;

  @IsOptional()
  @IsString()
  motivo?: string;
}
