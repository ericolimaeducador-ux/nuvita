import { FinanceiroConfig } from '../../domain/financeiro-config.entity';

export interface FinanceiroConfigRepository {
  findByClinica(clinicaId: string): Promise<FinanceiroConfig | null>;
  upsert(clinicaId: string, valorConsultaCentavos: number, atualizadoPor: string): Promise<FinanceiroConfig>;
}
