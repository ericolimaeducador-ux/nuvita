import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateProntuarioDto } from './create-prontuario.dto';

export class UpdateProntuarioDto extends PartialType(
  OmitType(CreateProntuarioDto, ['clinicaId', 'pacienteId'] as const),
) {}
