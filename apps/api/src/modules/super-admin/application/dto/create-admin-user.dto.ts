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

  /** Obrigatório para ENFERMEIRO (não vazio; TODO(legal): o formato do COREN ainda depende de fonte oficial). */
  @ValidateIf((o: { papel?: Papel }) => o.papel === Papel.ENFERMEIRO)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Informe o COREN do enfermeiro.' })
  coren?: string;
}
