import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsISO8601, IsOptional, Matches } from 'class-validator';
import { CreatePacienteDto } from './create-paciente.dto';

// CPF (dígito verificador) e nascimento (não futuro) são validados só na CRIAÇÃO. Aqui ficam as regras antigas (formato),
// para um paciente já cadastrado não quebrar o PATCH que reenvia o mesmo valor. A identidade não muda por este endpoint.
class UpdatePacienteBaseDto extends OmitType(CreatePacienteDto, ['clinicaId', 'cpf', 'dataNascimento'] as const) {
  @IsOptional()
  @Matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/)
  cpf?: string;

  @IsOptional()
  @IsISO8601()
  dataNascimento?: string;
}

export class UpdatePacienteDto extends PartialType(UpdatePacienteBaseDto) {}
