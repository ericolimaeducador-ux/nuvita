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

  @IsIn([Papel.PSICOLOGO, Papel.SECRETARIA])
  papel!: Papel.PSICOLOGO | Papel.SECRETARIA;

  /** Obrigatório para PSICÓLOGO (não vazio; o formato do CRP ainda depende de fonte oficial do CFP). */
  @ValidateIf((o: { papel?: Papel }) => o.papel === Papel.PSICOLOGO)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Informe o CRP do psicólogo.' })
  crp?: string;
}
