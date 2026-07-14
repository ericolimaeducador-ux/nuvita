import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ProdutoSolicitadoDto {
  @IsNumber() codigo!: number;
  @IsString() descricao!: string;
  @IsNumber() quantidade!: number;
  @IsString() unidade!: string;
  @IsOptional() @IsNumber() codigoSiafisico?: number;
}

export class CateterExternoDto {
  @IsOptional() @IsBoolean() incluirDescricaoTecnica?: boolean;
  @IsOptional() @IsBoolean() incluirCodigoSiafisico?: boolean;
}

export class CreateLaudoMedicoDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsString() pacienteId!: string;
  @IsString() avaliacaoIuId!: string;
  @IsDateString() dataLaudo!: string;
  @IsArray() @IsString({ each: true }) cid10!: string[];

  // ---- Texto narrativo (Relatório Médico Circunstanciado — CIL) ----
  @IsOptional() @IsString() contextoSocial?: string;
  @IsString() etiologia!: string;
  @IsOptional() @IsString() nivelLesao?: string;
  @IsString() diagnosticoFuncional!: string;
  @IsString() regimeCil!: string;
  @IsString() insumoAtual!: string;
  @IsOptional() @IsString() fornecedorAtual?: string;

  // ---- Quadro clínico e riscos (manuais — defaults aplicados no service) ----
  @IsOptional() @IsBoolean() riscoEsvaziamento?: boolean;
  @IsOptional() @IsBoolean() riscoItuAtual?: boolean;
  @IsOptional() @IsBoolean() riscoAntibioticoterapia?: boolean;
  @IsOptional() @IsBoolean() riscoTratoSuperior?: boolean;
  @IsOptional() @IsBoolean() riscoInsuficienciaRenal?: boolean;
  @IsOptional() @IsBoolean() riscoLesaoUretral?: boolean;
  @IsOptional() @IsBoolean() riscoPerdasNoturnas?: boolean;

  // ---- Deficiências do insumo atual (manuais) ----
  @IsOptional() @IsBoolean() deficienciaLubrificacao?: boolean;
  @IsOptional() @IsBoolean() deficienciaPontaProtetora?: boolean;
  @IsOptional() @IsBoolean() deficienciaMangaProtetora?: boolean;
  @IsOptional() @IsBoolean() deficienciaDor?: boolean;
  @IsOptional() @IsBoolean() deficienciaAlergiaLidocaina?: boolean;
  @IsOptional() @IsBoolean() deficienciaFrascoReutilizado?: boolean;
  @IsOptional() @IsBoolean() deficienciaRiscoInternacao?: boolean;

  // ---- Prescrição indicada (toggles manuais) ----
  @IsOptional() @IsBoolean() prescricaoIncluirCodigoFabricante?: boolean;
  @IsOptional() @IsBoolean() prescricaoEmbalagemPocket?: boolean;
  @IsOptional() @IsBoolean() prescricaoClausulaMarca?: boolean;
  @IsOptional() @IsBoolean() prescricaoCateterExterno?: boolean;
  @IsOptional() @IsBoolean() prescricaoIncluirObjetivo?: boolean;
  @IsOptional() @IsBoolean() prescricaoIncluirConclusao?: boolean;
  @IsOptional() @ValidateNested() @Type(() => CateterExternoDto) cateterExterno?: CateterExternoDto;

  @IsArray() produtosSolicitados!: ProdutoSolicitadoDto[];

  // ---- Comparativo técnico ANVISA (seleção manual) ----
  @IsOptional() @IsIn(['speedicath', 'gentlecath']) comparativoAnvisa?: 'speedicath' | 'gentlecath';

  // ---- Profissional e fecho ----
  @IsOptional() @IsString() medicoNomeExibicao?: string;
  @IsOptional() @IsString() medicoEspecialidade?: string;
  @IsOptional() @IsString() crmExibicao?: string;
  @IsOptional() @IsString() cidadeEmissao?: string;

  @IsOptional() @IsString() crmNumero?: string;
}
