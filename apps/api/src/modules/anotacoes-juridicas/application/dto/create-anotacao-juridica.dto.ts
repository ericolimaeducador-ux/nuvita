import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAnotacaoJuridicaDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsString() pacienteId!: string;
  @IsString() @MinLength(3) texto!: string;
}
