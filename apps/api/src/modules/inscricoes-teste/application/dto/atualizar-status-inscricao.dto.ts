import { IsEnum } from 'class-validator';
import { InscricaoTesteStatus } from '../../domain/inscricao-teste.entity';

export class AtualizarStatusInscricaoDto {
  @IsEnum(InscricaoTesteStatus)
  status!: InscricaoTesteStatus;
}
