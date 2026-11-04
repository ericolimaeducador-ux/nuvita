import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { LinhaTerapeutica } from '../../../pacientes/domain/paciente.entity';

// Só conteúdo clínico já digitado pelo psicólogo — nunca nome, CPF,
// endereço ou telefone do paciente (dado identificável não vai pra IA).
export class SugerirAbordagemDto {
  @IsOptional()
  @IsEnum(LinhaTerapeutica)
  linhaTerapeutica?: LinhaTerapeutica;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  motivoAtendimento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  diagnosticosSaudeMental?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  avaliacaoRisco?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  evolucao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  anotacoesLivres?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999)
  numeroSessoesAnteriores?: number;
}
