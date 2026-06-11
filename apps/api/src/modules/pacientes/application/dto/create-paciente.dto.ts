import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Sexo } from '../../domain/paciente.entity';
import { ConsentimentoLGpdDto } from './consentimento-lgpd.dto';
import { ConvenioDto } from './convenio.dto';
import { EnderecoDto } from './endereco.dto';

export class CreatePacienteDto {
  @IsMongoId()
  clinicaId!: string;

  @IsString()
  @IsNotEmpty()
  nome!: string;

  @Matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/)
  cpf!: string;

  @IsISO8601()
  dataNascimento!: string;

  @IsEnum(Sexo)
  sexo!: Sexo;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EnderecoDto)
  endereco?: EnderecoDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConvenioDto)
  convenio?: ConvenioDto;

  @ValidateNested()
  @Type(() => ConsentimentoLGpdDto)
  consentimentoLGPD!: ConsentimentoLGpdDto;
}
