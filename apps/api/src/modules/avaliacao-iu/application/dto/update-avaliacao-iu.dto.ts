import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateAvaliacaoIUDto } from './create-avaliacao-iu.dto';

// Edição de uma ficha já preenchida (ex.: completar o COREN esquecido). Todos
// os campos ficam opcionais; pacienteId não é editável (a ficha continua do
// mesmo paciente).
export class UpdateAvaliacaoIUDto extends PartialType(
  OmitType(CreateAvaliacaoIUDto, ['pacienteId'] as const),
) {}
