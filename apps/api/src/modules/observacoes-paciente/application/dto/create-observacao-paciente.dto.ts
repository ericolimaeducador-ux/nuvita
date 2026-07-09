import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateObservacaoPacienteDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsString() pacienteId!: string;
  @IsString() @MinLength(1) @MaxLength(4000) texto!: string;
}
