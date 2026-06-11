import { ArrayUnique, IsArray, IsEnum } from 'class-validator';
import { CanalNotificacao } from '../../domain/notificacao.entity';

export class UpdateOptOutDto {
  @IsArray()
  @ArrayUnique()
  @IsEnum(CanalNotificacao, { each: true })
  canaisOptOut!: CanalNotificacao[];
}
