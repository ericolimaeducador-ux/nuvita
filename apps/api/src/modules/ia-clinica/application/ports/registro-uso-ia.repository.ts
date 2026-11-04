import { RegistroUsoIa } from '../../domain/registro-uso-ia.entity';

export interface RegistroUsoIaRepository {
  create(data: Omit<RegistroUsoIa, 'id' | 'criadoEm'>): Promise<RegistroUsoIa>;
  /** Escopo por tenant: um registro de outra clínica retorna null (→ 404). */
  findByIdAndClinica(id: string, clinicaId: string): Promise<RegistroUsoIa | null>;
}
