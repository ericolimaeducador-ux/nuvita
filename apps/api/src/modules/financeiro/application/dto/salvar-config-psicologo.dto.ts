import { IsMongoId, IsOptional, IsPositive } from 'class-validator';

export class SalvarConfigPsicologoDto {
  /** Preço de uma sessão. O ciclo de 4 é sugerido a partir dele. */
  @IsPositive()
  valorSessao!: number;

  /** Só admin/super-admin: configura em nome de um psicólogo. */
  @IsOptional()
  @IsMongoId()
  profissionalId?: string;
}
