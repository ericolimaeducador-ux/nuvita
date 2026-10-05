import { IsEnum, IsOptional } from 'class-validator';
import { TicketStatus } from '../../domain/ticket.entity';

export class ListarTicketsQueryDto {
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;
}
