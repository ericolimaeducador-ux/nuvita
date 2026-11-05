import { Cobranca, StatusCobranca } from '../../domain/cobranca.entity';

export type NovaCobranca = Omit<Cobranca, 'id' | 'criadoEm' | 'atualizadoEm'>;

export interface ListCobrancasClinicaInput {
  clinicaId: string;
  /** Status EFETIVOS desejados (vencida inclusa); vazio/ausente = todos. */
  status?: StatusCobranca[];
  /** Início do dia de hoje (UTC): separa "vencida" de "pendente/enviada" pelo vencimento. */
  hoje: Date;
  cursor?: string;
  limit?: number;
}

export interface PaginaCobrancas {
  items: Cobranca[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface CobrancaRepository {
  create(data: NovaCobranca): Promise<Cobranca>;
  findById(clinicaId: string, id: string): Promise<Cobranca | null>;
  findByConsultaId(clinicaId: string, consultaId: string): Promise<Cobranca | null>;
  listByPaciente(clinicaId: string, pacienteId: string): Promise<Cobranca[]>;
  /** Lista da CLÍNICA, mais antigas por vencer primeiro, paginada por cursor (padrão do psi: items/hasMore/nextCursor). */
  listByClinica(input: ListCobrancasClinicaInput): Promise<PaginaCobrancas>;
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
