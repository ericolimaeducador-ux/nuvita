import { PapelSala, SalaEvento, TipoEventoSala } from '../../domain/sala-evento.entity';

export interface CreateSalaEventoInput {
  clinicaId: string;
  salaId: string;
  papel: PapelSala;
  tipo: TipoEventoSala;
  detalhes?: string;
  ip?: string;
  userAgent?: string;
}

export interface SalaEventoRepository {
  create(input: CreateSalaEventoInput): Promise<SalaEvento>;
  listBySala(clinicaId: string, salaId: string): Promise<SalaEvento[]>;
}
