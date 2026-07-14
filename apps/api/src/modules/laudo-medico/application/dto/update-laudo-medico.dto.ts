import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateLaudoMedicoDto } from './create-laudo-medico.dto';

export class UpdateLaudoMedicoDto extends PartialType(
  OmitType(CreateLaudoMedicoDto, ['pacienteId', 'avaliacaoIuId', 'clinicaId'] as const),
) {}
