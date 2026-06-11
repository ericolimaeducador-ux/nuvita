import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsMongoId,
  IsOptional,
  IsPhoneNumber,
  IsString,
  ValidateIf,
} from 'class-validator';
import {
  CanalNotificacao,
  TipoNotificacao,
} from '../../domain/notificacao.entity';

export class CreateNotificacaoDto {
  @IsMongoId()
  clinicaId!: string;

  @IsMongoId()
  destinatarioId!: string;

  @IsEnum(TipoNotificacao)
  tipo!: TipoNotificacao;

  @IsEnum(CanalNotificacao)
  canal!: CanalNotificacao;

  @ValidateIf((dto: CreateNotificacaoDto) => dto.canal === CanalNotificacao.EMAIL)
  @IsEmail()
  email?: string;

  @ValidateIf((dto: CreateNotificacaoDto) => dto.canal !== CanalNotificacao.EMAIL)
  @IsPhoneNumber()
  telefone?: string;

  @IsString()
  nome!: string;

  @IsOptional()
  @IsString()
  hora?: string;

  @IsOptional()
  @IsString()
  medico?: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsString()
  documento?: string;

  @IsOptional()
  @IsString()
  timezonePaciente?: string;

  @IsOptional()
  @IsISO8601()
  enviarApos?: string;
}
