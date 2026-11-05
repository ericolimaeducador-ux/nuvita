import { IsISO8601, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { IsCpfValido } from './paciente-campos.validator';

/**
 * Correção de nome/CPF/data de nascimento por SUPER_ADMIN
 * (feature-correcao-identidade-paciente). Executor e timestamp NÃO vêm do corpo:
 * são o usuário autenticado e o relógio do servidor.
 */
export class CorrigirIdentidadePacienteDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nome?: string;

  @IsOptional()
  @Matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/)
  @IsCpfValido()
  cpf?: string;

  @IsOptional()
  @IsISO8601()
  dataNascimento?: string;

  /** Justificativa de quem solicitou a correção — obrigatória. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  justificativa!: string;

  /** Ticket de origem (feature-tickets-superadmin), quando houver. */
  @IsOptional()
  @IsString()
  ticketId?: string;

  /** Usuário que pediu a correção; ausente = o próprio SUPER_ADMIN. */
  @IsOptional()
  @IsString()
  solicitanteUserId?: string;
}
