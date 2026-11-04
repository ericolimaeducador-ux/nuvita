import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AnalyticsQueryDto {
  @IsOptional()
  @IsString()
  clinicaId?: string;

  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;
}

export class RelatorioPsicologiaQueryDto {
  @IsOptional()
  @IsString()
  clinicaId?: string;

  @IsOptional()
  @IsString()
  profissionalId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  diasLimite?: number;
}

export class HorariosVagosQueryDto {
  @IsOptional()
  @IsString()
  clinicaId?: string;

  @IsOptional()
  @IsString()
  profissionalId?: string;

  @IsDateString()
  data!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  horaInicio?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  horaFim?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([15, 30, 45, 60, 90, 120])
  slotMinutos?: number;
}
