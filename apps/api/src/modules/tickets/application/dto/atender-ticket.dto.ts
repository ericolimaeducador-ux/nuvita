import { IsISO8601, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

/** Valores corrigidos que o SUPER_ADMIN aplica ao atender o ticket. */
export class AtenderTicketDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nome?: string;

  @IsOptional()
  @Matches(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/)
  cpf?: string;

  @IsOptional()
  @IsISO8601()
  dataNascimento?: string;
}
