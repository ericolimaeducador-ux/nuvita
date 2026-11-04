import { DecisaoUsoIA } from './registro-uso-ia.enum';

/**
 * Decisão humana (aceitar/descartar) sobre uma sugestão da IA, imutável e
 * ligada a um RegistroUsoIa. `registroUsoIaId` guarda o `_id` (string) do
 * registro de origem. No máximo uma decisão por registro.
 */
export interface DecisaoUsoIa {
  id: string;
  registroUsoIaId: string;
  usuarioId: string;
  /** Ausente nas decisões anteriores à adição do campo (sem backfill); a clínica sai do registro de origem. */
  clinicaId?: string;
  decisao: DecisaoUsoIA;
  decididoEm: Date;
}
