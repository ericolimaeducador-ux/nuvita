import { Cobranca, StatusCobranca } from '../../domain/cobranca.entity';

export type NovaCobranca = Omit<Cobranca, 'id' | 'criadoEm' | 'atualizadoEm'>;

export interface CobrancaRepository {
  create(data: NovaCobranca): Promise<Cobranca>;
  findById(clinicaId: string, id: string): Promise<Cobranca | null>;
  listByPaciente(clinicaId: string, pacienteId: string): Promise<Cobranca[]>;
  /** Cobranças da clínica com vencimento em [de, ate) OU pagas em [de, ate) — base do resumo mensal. */
  listParaResumo(clinicaId: string, de: Date, ate: Date): Promise<Cobranca[]>;
  /** Atualização condicional ao status gravado (evita corrida: pagar uma cobrança que acabou de ser cancelada). */
  update(
    clinicaId: string,
    id: string,
    statusPermitidos: StatusCobranca[],
    data: Partial<Omit<Cobranca, 'id' | 'clinicaId' | 'criadoEm'>>,
  ): Promise<Cobranca | null>;
}
