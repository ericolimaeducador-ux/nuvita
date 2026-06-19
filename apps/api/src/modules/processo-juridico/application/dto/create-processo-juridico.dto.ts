import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusProcesso } from '../../domain/processo-juridico.entity';

export class CreateProcessoJuridicoDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsString() pacienteId!: string;
  @IsString() avaliacaoIuId!: string;
  @IsString() laudoMedicoId!: string;
  @IsOptional() @IsString() observacoes?: string;
}

export class UpdateStatusProcessoDto {
  @IsEnum(StatusProcesso) status!: StatusProcesso;
  @IsOptional() @IsString() observacoes?: string;
  @IsOptional() @IsString() numeroProcesso?: string;
  @IsOptional() @IsString() tribunal?: string;
}
