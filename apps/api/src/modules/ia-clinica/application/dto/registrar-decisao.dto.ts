import { IsEnum } from 'class-validator';
import { DecisaoUsoIA } from '../../domain/registro-uso-ia.enum';

// Decisão humana sobre uma sugestão da IA. O registroUsoIaId vem do path.
export class RegistrarDecisaoDto {
  @IsEnum(DecisaoUsoIA)
  decisao!: DecisaoUsoIA;
}
