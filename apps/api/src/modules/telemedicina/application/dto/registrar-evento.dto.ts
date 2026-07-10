import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { TipoEventoSala } from '../../domain/sala-evento.entity';

/** Eventos que o cliente pode reportar; ENTROU é registrado só pelo backend, no /entrar. */
const EVENTOS_REPORTAVEIS = [
  TipoEventoSala.SAIU,
  TipoEventoSala.DESCONECTOU,
  TipoEventoSala.RECONECTOU,
  TipoEventoSala.FALHA_CONEXAO,
  TipoEventoSala.MIDIA_NEGADA,
  TipoEventoSala.ENCERRADA,
] as const;

export class RegistrarEventoDto {
  @IsEnum(TipoEventoSala)
  @IsIn(EVENTOS_REPORTAVEIS as readonly string[])
  tipo!: TipoEventoSala;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  detalhes?: string;
}
