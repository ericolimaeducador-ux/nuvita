import { IsMongoId, IsOptional } from 'class-validator';

export class ListDocumentosQueryDto {
  @IsOptional()
  @IsMongoId()
  clinicaId?: string;

  @IsOptional()
  @IsMongoId()
  pacienteId?: string;

  @IsOptional()
  @IsMongoId()
  prontuarioId?: string;
}
