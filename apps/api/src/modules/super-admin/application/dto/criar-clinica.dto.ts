import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDefined, IsEmail, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, Validate, ValidateIf, ValidateNested } from 'class-validator';
import { TipoDocumentoFiscal } from '../../../../../../../packages/shared/src/documentos';
import { DocumentoFiscalConstraint } from '../../../clinicas/application/dto/documento-fiscal.validator';
import { PlanoClinica } from '../../../clinicas/domain/clinica.entity';

const trimTexto = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

class ClinicaInputDto {
  @IsString()
  @IsNotEmpty()
  nome!: string;

  /**
   * CPF para profissional que atende como pessoa física; CNPJ para empresa. OPCIONAL na criação: a psicóloga informa
   * o documento do consultório no primeiro uso. Os dois campos andam juntos.
   */
  @ValidateIf((o: ClinicaInputDto) => o.documento !== undefined || o.tipoDocumento !== undefined)
  @IsEnum(TipoDocumentoFiscal)
  tipoDocumento?: TipoDocumentoFiscal;

  @ValidateIf((o: ClinicaInputDto) => o.documento !== undefined || o.tipoDocumento !== undefined)
  @IsString()
  @IsNotEmpty()
  @Validate(DocumentoFiscalConstraint)
  documento?: string;

  @IsEnum(PlanoClinica)
  plano!: PlanoClinica;

  /**
   * Clínica do teste beta (usuários aceitam o Termo de Teste)? A escolha é OBRIGATÓRIA, sem padrão silencioso:
   * esquecer a marcação depois do lançamento colocaria o Termo de Teste na frente de clientes reais.
   * O tipo fica opcional só para não quebrar quem monta o DTO em código; a validação (IsDefined) exige.
   */
  @IsDefined({ message: 'faseTeste é obrigatório: informe se é clínica do teste beta.' })
  @IsBoolean()
  faseTeste?: boolean;

  @IsString()
  @IsNotEmpty()
  fusoHorario!: string;

  @IsInt()
  @Min(5)
  duracaoConsultaPadrao!: number;

  /** Contato impresso no timbre dos documentos clínicos. */
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
