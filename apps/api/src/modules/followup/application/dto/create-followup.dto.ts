import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { StatusElegibilidade } from '../../domain/followup.entity';

export class CreateFollowUpDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsMongoId() pacienteId!: string;
  // Opcional; quando vem, o serviço valida que a avaliação existe e é deste paciente/clínica.
  @IsOptional() @IsMongoId() avaliacaoIuId?: string;
  @IsDateString() dataFollowup!: string;
  @IsEnum(StatusElegibilidade) statusElegibilidade!: StatusElegibilidade;
  @IsString() @IsNotEmpty() @MaxLength(5000) observacoes!: string;
  // Campo opcional de <input type="date">: vazio chega como '' e @IsOptional
  // só ignora null/undefined — sem o Transform, '' reprova no @IsDateString.
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsDateString()
  proximoFollowup?: string;
}
