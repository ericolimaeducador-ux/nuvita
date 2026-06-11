import { IsMongoId, IsOptional } from 'class-validator';

export class ListProntuariosQueryDto {
  @IsOptional()
  @IsMongoId()
  clinicaId?: string;

  @IsOptional()
  @IsMongoId()
  pacienteId?: string;
}
