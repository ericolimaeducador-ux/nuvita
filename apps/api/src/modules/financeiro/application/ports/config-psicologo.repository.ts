import { ConfigPsicologo } from '../../domain/psicologia.entity';

export interface ConfigPsicologoRepository {
  find(clinicaId: string, profissionalId: string): Promise<ConfigPsicologo | null>;
  /** Cria ou atualiza o preço de sessão do profissional. */
  save(clinicaId: string, profissionalId: string, valorSessao: number): Promise<ConfigPsicologo>;
}
