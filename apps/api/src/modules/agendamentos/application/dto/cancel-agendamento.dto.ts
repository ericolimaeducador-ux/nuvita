import { IsOptional, IsString } from 'class-validator';

export class CancelAgendamentoDto {
  @IsOptional()
  @IsString()
  motivoCancelamento?: string;
}
