import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusElegibilidade } from '../../domain/followup.entity';

export class CreateFollowUpDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsString() pacienteId!: string;
  @IsString() avaliacaoIuId!: string;
  @IsDateString() dataFollowup!: string;
  @IsEnum(StatusElegibilidade) statusElegibilidade!: StatusElegibilidade;
  @IsString() observacoes!: string;
  // Campo opcional de <input type="date">: vazio chega como '' e @IsOptional
  // só ignora null/undefined — sem o Transform, '' reprova no @IsDateString.
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsDateString()
  proximoFollowup?: string;
}
