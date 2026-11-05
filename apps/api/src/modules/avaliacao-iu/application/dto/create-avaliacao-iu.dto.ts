// TODO(conteudo): TODO o conteúdo clínico desta ficha (os ~33 campos, enums, rótulos e textos) é do fluxo de
// incontinência urinária e foi mantido exatamente como no Nuvita antigo. Revisar/substituir na etapa de conteúdo
// (estomaterapia). Os VALORES gravados em `avaliacoes_iu` não mudam.
import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsMongoId, IsNumber, IsOptional, IsString, Min, ValidateNested,
} from 'class-validator';
import { Destreza, EncaminhamentoIU, LocalAtendimento, PerfilCliente, TipoIU } from '../../domain/avaliacao-iu.entity';

// Produto indicado (referência ao catálogo de produtos pelo código). Antes era um objeto solto; agora é validado.
export class ProdutoIndicadoDto {
  @IsInt() @Min(1) codigo!: number;
  // O catálogo tem produto 'universal' e produto sem calibre (french 0): a tela envia o que o produto tem.
  @IsIn(['feminino', 'masculino', 'universal']) sexo!: 'feminino' | 'masculino' | 'universal';
  @IsInt() @Min(0) french!: number;
}

export class CreateAvaliacaoIUDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsMongoId() pacienteId!: string;
  @IsOptional() @IsString() agendamentoId?: string;
  @IsDateString() dataAtendimento!: string;
  @IsEnum(LocalAtendimento) local!: LocalAtendimento;
  @IsOptional() @IsString() prescritor?: string;
  @IsOptional() @IsString() planoSaude?: string;
  @IsOptional() @IsString() hospitalReferencia?: string;
  @IsString() motivoIU!: string;
  @IsOptional() @IsString() inicioSintomas?: string;
  @IsEnum(PerfilCliente) perfilCliente!: PerfilCliente;
  @IsEnum(Destreza) destreza!: Destreza;
  @IsBoolean() dntui!: boolean;
  @IsArray() @IsEnum(TipoIU, { each: true }) tiposIU!: TipoIU[];
  @IsBoolean() miccaoEspontanea!: boolean;
  @IsOptional() @IsNumber() volumeAproximadoMl?: number;
  @IsBoolean() realizaCateterismo!: boolean;
  @IsOptional() @IsNumber() cateterismosDia?: number;
  @IsOptional() @IsString() cateterUtilizado?: string;
  @IsOptional() @IsString() ultimaInfeccaoUrinaria?: string;
  @IsBoolean() emTratamento!: boolean;
  @IsOptional() @IsString() tratamento?: string;
  @IsOptional() @IsString() volumeDrenadoMl?: string;
  @IsOptional() @IsString() outrasIntercorrencias?: string;
  @IsOptional() @ValidateNested() @Type(() => ProdutoIndicadoDto) produtoIndicado?: ProdutoIndicadoDto;
  @IsOptional() @IsString() responsavelCateterismo?: string;
  @IsBoolean() autorizaPesquisa!: boolean;
  @IsBoolean() aceitaInformacoes!: boolean;
  @IsOptional() @IsString() emailContato?: string;
  @IsOptional() @IsString() whatsappContato?: string;
  @IsOptional() @IsString() coren?: string;
  @IsOptional() @IsEnum(EncaminhamentoIU) encaminhamento?: EncaminhamentoIU;
  @IsOptional() @IsString() localEncaminhamento?: string;
  @IsOptional() @IsString() respCuidador?: string;
}
