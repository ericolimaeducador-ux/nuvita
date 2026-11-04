import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTestePsicologicoDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsString() pacienteId!: string;
  @IsString() @MinLength(1) @MaxLength(200) nomeTeste!: string;
  @IsDateString() dataAplicacao!: string;
  @IsOptional() @IsString() @MaxLength(4000) resultado?: string;
}
