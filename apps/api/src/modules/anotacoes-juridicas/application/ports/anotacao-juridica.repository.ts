import { AnotacaoJuridica } from '../../domain/anotacao-juridica.entity';

export interface AnotacaoJuridicaRepository {
  create(data: Omit<AnotacaoJuridica, 'id' | 'criadoEm'>): Promise<AnotacaoJuridica>;
  listByPaciente(clinicaId: string, pacienteId: string): Promise<AnotacaoJuridica[]>;
}
