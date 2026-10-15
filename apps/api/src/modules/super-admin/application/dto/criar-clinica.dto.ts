import { Type } from 'class-transformer';
import { IsEmail, IsEnum, IsInt, IsNotEmpty, IsString, Min, Validate, ValidateNested } from 'class-validator';
import { TipoDocumentoFiscal } from '../../../../../../../packages/shared/src/documentos';
import { DocumentoFiscalConstraint } from '../../../clinicas/application/dto/documento-fiscal.validator';
import { PlanoClinica } from '../../../clinicas/domain/clinica.entity';

class ClinicaInputDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;

  /** CPF para profissional que atende como pessoa física; CNPJ para empresa. */
  @IsEnum(TipoDocumentoFiscal)
  tipoDocumento!: TipoDocumentoFiscal;

  @IsString()
  @IsNotEmpty()
  @Validate(DocumentoFiscalConstraint)
  documento!: string;

  @IsEnum(PlanoClinica)
  plano!: PlanoClinica;

  @IsString()
  @IsNotEmpty()
  fusoHorario!: string;

  @IsInt()
  @Min(5)
  duracaoConsultaPadrao!: number;
}

class PrimeiroAdminInputDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;

  @IsEmail()
  email!: string;
}

/**
 * Corpo de POST /super-admin/clinicas. Campos mínimos — os mesmos que a CLI
 * bootstrap-admin já usa. A senha do admin NÃO vem aqui: é gerada no backend.
 */
export class CriarClinicaDto {
  @ValidateNested()
  @Type(() => ClinicaInputDto)
  clinica!: ClinicaInputDto;

  @ValidateNested()
  @Type(() => PrimeiroAdminInputDto)
  primeiroAdmin!: PrimeiroAdminInputDto;
}
