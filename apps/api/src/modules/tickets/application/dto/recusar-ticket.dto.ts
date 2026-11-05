import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RecusarTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  motivo!: string;
}
