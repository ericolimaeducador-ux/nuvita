import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { Papel } from '../../../../../../../packages/shared/src/auth';

export class CreateAdminUserDto {
  @IsString()
  nome!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10)
  password!: string;

  @IsEnum(Papel)
  papel!: Papel;

  @IsOptional()
  @IsString()
  clinicaId?: string;

  @IsOptional()
  @IsString()
  registroProfissional?: string;

  /** Obrigatório para PSICÓLOGO (não vazio; o formato do CRP ainda depende de fonte oficial do CFP). */
  @ValidateIf((o: { papel?: Papel }) => o.papel === Papel.PSICOLOGO)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Informe o CRP do psicólogo.' })
  crp?: string;
}
