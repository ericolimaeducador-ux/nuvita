import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsArray, IsDateString } from 'class-validator';
import { Destreza, EncaminhamentoIU, LocalAtendimento, PerfilCliente, TipoIU } from '../../domain/avaliacao-iu.entity';

export class CreateAvaliacaoIUDto {
  @IsOptional() @IsString() clinicaId?: string;
  @IsString() pacienteId!: string;
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
  @IsOptional() produtoIndicado?: { codigo: number; sexo: 'feminino' | 'masculino'; french: number };
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
