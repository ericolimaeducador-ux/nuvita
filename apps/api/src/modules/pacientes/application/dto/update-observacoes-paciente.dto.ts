import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateObservacoesPacienteDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsString() @MaxLength(4000) observacoes!: string;
}
