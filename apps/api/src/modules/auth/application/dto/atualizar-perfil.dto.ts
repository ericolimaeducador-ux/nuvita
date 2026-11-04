import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Corpo de PATCH /auth/me. SÓ aceita o CRP (whitelist + forbidNonWhitelisted rejeita papel, clinicaId, id...).
 * Formato do CRP não validado — confirmar em fonte do CFP antes de adicionar regex.
 */
export class AtualizarPerfilDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  crp!: string;
}
