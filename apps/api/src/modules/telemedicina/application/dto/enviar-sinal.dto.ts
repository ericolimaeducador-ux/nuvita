import { IsDefined, IsEnum } from 'class-validator';
import { TipoSinal } from '../../domain/sinal-sala.entity';

export class EnviarSinalDto {
  @IsEnum(TipoSinal)
  tipo!: TipoSinal;

  /** SDP (offer/answer) ou ICE candidate — repassado opaco ao outro participante. */
  @IsDefined()
  payload!: unknown;
}
