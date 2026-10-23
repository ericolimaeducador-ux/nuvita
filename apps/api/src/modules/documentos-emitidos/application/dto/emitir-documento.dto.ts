import { IsMongoId } from 'class-validator';

/** Só ids: data e hora do documento vêm do agendamento, nunca do corpo da requisição. */
export class EmitirDocumentoDto {
  @IsMongoId()
  pacienteId!: string;

  @IsMongoId()
  agendamentoId!: string;
}
