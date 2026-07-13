import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ListSalasQueryDto {
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
