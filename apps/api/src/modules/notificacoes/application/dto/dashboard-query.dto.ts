import { IsEnum, IsISO8601, IsMongoId, IsOptional } from 'class-validator';
import { CanalNotificacao, StatusNotificacao, TipoNotificacao } from '../../domain/notificacao.entity';

export class DashboardNotificacoesQueryDto {
  @IsOptional()
  @IsMongoId()
  clinicaId?: string;

  @IsOptional()
  @IsEnum(StatusNotificacao)
  status?: StatusNotificacao;

  @IsOptional()
  @IsEnum(CanalNotificacao)
  canal?: CanalNotificacao;

  @IsOptional()
  @IsEnum(TipoNotificacao)
  tipo?: TipoNotificacao;

  @IsOptional()
  @IsISO8601()
  inicio?: string;

  @IsOptional()
  @IsISO8601()
  fim?: string;
}
