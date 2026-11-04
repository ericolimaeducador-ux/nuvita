import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Abertura de ticket. Status, autor, tipo e datas são sempre do servidor (forbidNonWhitelisted barra o resto). */
export class CriarTicketDto {
  @IsString()
  @IsNotEmpty()
  pacienteId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  justificativa!: string;
}
