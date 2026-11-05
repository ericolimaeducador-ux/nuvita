import {
  IsBoolean,
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

  // "Olá {nome}" — o destinatário EFETIVO da mensagem: o responsável legal do
  // paciente menor (ver PacientesService.resumoPorIds()/contatoEfetivo()), ou o
  // próprio paciente. Quando os dois divergem, `nomePaciente` guarda o nome do
  // paciente para o "sobre {nomePaciente}" do texto (ver notificacao-template.service.ts).
  @IsString()
  nome!: string;

  @IsOptional()
  @IsString()
  nomePaciente?: string;

  // true quando `nome`/`email` acima são do responsável legal, não do paciente —
  // escolhe a variante do texto que se dirige ao responsável (ver
  // NotificacaoTemplateService.render()).
  @IsOptional()
  @IsBoolean()
  paraResponsavel?: boolean;

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

  // Aviso de cobrança: valor já formatado (R$ 0,00) e vencimento (DD/MM/AAAA).
  @IsOptional()
  @IsString()
  valor?: string;

  @IsOptional()
  @IsString()
  vencimento?: string;

  @IsOptional()
  @IsString()
  timezonePaciente?: string;

  @IsOptional()
  @IsISO8601()
  enviarApos?: string;
}
