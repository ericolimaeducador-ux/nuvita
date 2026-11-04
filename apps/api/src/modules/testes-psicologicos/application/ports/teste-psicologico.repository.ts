import { TestePsicologico } from '../../domain/teste-psicologico.entity';

export interface TestePsicologicoRepository {
  create(data: Omit<TestePsicologico, 'id' | 'criadoEm'>): Promise<TestePsicologico>;
  listByPaciente(clinicaId: string, pacienteId: string): Promise<TestePsicologico[]>;
}
