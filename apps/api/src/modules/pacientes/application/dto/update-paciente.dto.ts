import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreatePacienteDto } from './create-paciente.dto';

export class UpdatePacienteDto extends PartialType(
  OmitType(CreatePacienteDto, ['clinicaId', 'consentimentoLGPD'] as const),
) {}
