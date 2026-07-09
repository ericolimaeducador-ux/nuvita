import {
  IsBoolean,
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
import { ProjetoPaciente, Sexo } from '../../domain/paciente.entity';
import { ConsentimentoLGpdDto } from './consentimento-lgpd.dto';
import { ConvenioDto } from './convenio.dto';
import { EnderecoDto } from './endereco.dto';

export class CreatePacienteDto {
  @IsMongoId()
  clinicaId!: string;

  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsOptional()
  @Matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/)
  cpf?: string;

  @IsOptional()
  @IsISO8601()
  dataNascimento?: string;

  @IsOptional()
  @IsEnum(Sexo)
  sexo?: Sexo;

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

  @IsOptional()
  @ValidateNested()
  @Type(() => ConsentimentoLGpdDto)
  consentimentoLGPD?: ConsentimentoLGpdDto;

  @IsOptional()
  @IsBoolean()
  programaIU?: boolean;

  @IsOptional()
  @IsEnum(ProjetoPaciente)
  projeto?: ProjetoPaciente;
}
