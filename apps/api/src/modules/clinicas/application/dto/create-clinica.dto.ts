import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, ValidateNested, IsInt, Min, Validate } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TipoDocumentoFiscal } from '../../../../../../../packages/shared/src/documentos';
import { PlanoClinica } from '../../domain/clinica.entity';
import { DocumentoFiscalConstraint } from './documento-fiscal.validator';

const trimTexto = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

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

  @IsOptional()
  @Transform(trimTexto)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  telefone?: string;

  @IsOptional()
  @Transform(trimTexto)
  @IsEmail()
  emailContato?: string;

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

  /** CPF ou CNPJ conforme `tipoDocumento`; aceita com ou sem pontuação. OBRIGATÓRIO aqui (só a criação pelo super-admin o dispensa). */
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
