import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateCobrancaDto } from './create-cobranca.dto';

// Edição de uma cobrança ainda em aberto (pendente/enviada). O paciente da cobrança não muda.
export class UpdateCobrancaDto extends PartialType(OmitType(CreateCobrancaDto, ['pacienteId'] as const)) {}
