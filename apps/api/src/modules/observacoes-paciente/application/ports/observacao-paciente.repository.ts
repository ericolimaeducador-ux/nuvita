import { ObservacaoPaciente } from '../../domain/observacao-paciente.entity';

export interface ObservacaoPacienteRepository {
  create(data: Omit<ObservacaoPaciente, 'id' | 'criadoEm'>): Promise<ObservacaoPaciente>;
  listByPaciente(clinicaId: string, pacienteId: string): Promise<ObservacaoPaciente[]>;
}
