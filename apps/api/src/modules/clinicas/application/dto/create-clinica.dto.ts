import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength, ValidateNested, IsInt, Min, Validate } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoDocumentoFiscal } from '../../../../../../../packages/shared/src/documentos';
import { PlanoClinica } from '../../domain/clinica.entity';
import { DocumentoFiscalConstraint } from './documento-fiscal.validator';

export class EnderecoClinicaDto {
  @IsOptional()
  @IsString()
  logradouro?: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  complemento?: string;

  @IsOptional()
  @IsString()
  bairro?: string;

  @IsOptional()
  @IsString()
  cidade?: string;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  cep?: string;
}

export class ConfiguracoesClinicaDto {
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  corPrimaria?: string;

  @IsOptional()
  @IsString()
  whatsappNumero?: string;

  @IsOptional()
  @IsEmail()
  emailRemetente?: string;

  @IsString()
  fusoHorario!: string;

  @IsInt()
  @Min(5)
  duracaoConsultaPadrao!: number;
}

export class PrimeiroAdminDto {
  @IsString()
  nome!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10)
  password!: string;
}

export class CreateClinicaDto {
  @IsString()
  nome!: string;

  @IsEnum(TipoDocumentoFiscal)
  tipoDocumento!: TipoDocumentoFiscal;

  /** CPF ou CNPJ conforme `tipoDocumento`; aceita com ou sem pontuação. */
  @IsString()
  @Validate(DocumentoFiscalConstraint)
  documento!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EnderecoClinicaDto)
  endereco?: EnderecoClinicaDto;

  @IsEnum(PlanoClinica)
  plano!: PlanoClinica;

  /** Clínica do teste beta (Termo de Teste no aceite). Ausente = false. */
  @IsOptional()
  @IsBoolean()
  faseTeste?: boolean;

  @ValidateNested()
  @Type(() => ConfiguracoesClinicaDto)
  configuracoes!: ConfiguracoesClinicaDto;

  @ValidateNested()
  @Type(() => PrimeiroAdminDto)
  primeiroAdmin!: PrimeiroAdminDto;
}
