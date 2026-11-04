import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Corpo de PATCH /auth/me. SÓ aceita o COREN (whitelist + forbidNonWhitelisted rejeita papel, clinicaId, id...).
 * TODO(legal): formato do COREN não validado — confirmar em fonte oficial antes de adicionar regex.
 */
export class AtualizarPerfilDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  coren!: string;
}
