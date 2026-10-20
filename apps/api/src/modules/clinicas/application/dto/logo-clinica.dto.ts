import { IsInt, IsString, Matches, Max, Min } from 'class-validator';
import { LOGO_MAX_BYTES } from '../../clinicas.constants';

export class SolicitarUploadLogoDto {
  // Valor exato é checado no serviço (PNG/JPG; sem SVG) para devolver 422.
  @IsString()
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(LOGO_MAX_BYTES)
  tamanho!: number;

  @Matches(/^[a-f0-9]{64}$/i)
  hash!: string;
}

export class ConfirmarLogoDto {
  @IsString()
  logoKey!: string;
}
