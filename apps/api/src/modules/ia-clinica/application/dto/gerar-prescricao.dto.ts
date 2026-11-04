import { IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { LinhaTerapeutica } from '../../../pacientes/domain/paciente.entity';

// Só conteúdo clínico já digitado pelo psicólogo — nunca nome, CPF,
// endereço ou telefone do paciente (dado identificável não vai pra IA).
export class GerarPrescricaoDto {
  @IsOptional()
  @IsEnum(LinhaTerapeutica)
  linhaTerapeutica?: LinhaTerapeutica;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  contextoClinico?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  checklistSelecionado?: string[];
}
