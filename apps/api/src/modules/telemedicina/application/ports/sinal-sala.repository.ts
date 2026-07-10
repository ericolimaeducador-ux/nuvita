import { PapelSala } from '../../domain/sala-evento.entity';
import { SinalSala, TipoSinal } from '../../domain/sinal-sala.entity';

export interface CreateSinalInput {
  salaId: string;
  de: PapelSala;
  tipo: TipoSinal;
  payload: unknown;
}

export interface SinalSalaRepository {
  create(input: CreateSinalInput): Promise<SinalSala>;
  /** Sinais destinados a `para` (enviados pelo outro papel), após o id `after`, em ordem de chegada. */
  listPara(salaId: string, para: PapelSala, after?: string): Promise<SinalSala[]>;
}
