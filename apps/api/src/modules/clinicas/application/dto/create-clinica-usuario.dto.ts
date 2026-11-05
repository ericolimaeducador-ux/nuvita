import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsNotEmpty, IsString, MinLength, ValidateIf } from 'class-validator';
import { Papel } from '../../../../../../../packages/shared/src/auth';

export class CreateClinicaUsuarioDto {
  @IsString()
  nome!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10)
  password!: string;

  @IsIn([Papel.ENFERMEIRO, Papel.SECRETARIA])
  papel!: Papel.ENFERMEIRO | Papel.SECRETARIA;

  /** Obrigatório para ENFERMEIRO (não vazio; TODO(legal): o formato do COREN ainda depende de fonte oficial). */
  @ValidateIf((o: { papel?: Papel }) => o.papel === Papel.ENFERMEIRO)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Informe o COREN do enfermeiro.' })
  coren?: string;
}
