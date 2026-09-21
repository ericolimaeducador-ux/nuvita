import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { PLANO_IDS, type PlanoId } from '../planos';

export class CriarPreferenciaDto {
  @ApiProperty({ enum: PLANO_IDS, example: 'psicologia-vista' })
  @IsIn(PLANO_IDS)
  plano!: PlanoId;
}
