import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusElegibilidade } from '../../domain/followup.entity';

export class CreateFollowUpDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsString() pacienteId!: string;
  @IsString() avaliacaoIuId!: string;
  @IsDateString() dataFollowup!: string;
  @IsEnum(StatusElegibilidade) statusElegibilidade!: StatusElegibilidade;
  @IsString() observacoes!: string;
  @IsOptional() @IsDateString() proximoFollowup?: string;
}
