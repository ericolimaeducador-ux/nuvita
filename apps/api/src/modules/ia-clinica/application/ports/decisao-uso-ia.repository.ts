import { DecisaoUsoIa } from '../../domain/decisao-uso-ia.entity';

export interface DecisaoUsoIaRepository {
  create(data: Omit<DecisaoUsoIa, 'id' | 'decididoEm' | 'clinicaId'> & { clinicaId: string }): Promise<DecisaoUsoIa>;
  /** Fast-path do 409; a garantia real contra corrida é o índice único. */
  existsForRegistro(registroUsoIaId: string): Promise<boolean>;
}
