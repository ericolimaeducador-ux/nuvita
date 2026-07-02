import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusProcesso } from '../../domain/processo-juridico.entity';

export class ListProcessosPorStatusQueryDto {
  @IsEnum(StatusProcesso)
  status!: StatusProcesso;

  @IsOptional()
  @IsString()
  clinicaId?: string;
}
