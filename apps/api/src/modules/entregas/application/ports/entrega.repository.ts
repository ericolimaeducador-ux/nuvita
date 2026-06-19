import { Entrega, StatusEntrega } from '../../domain/entrega.entity';

export interface EntregaRepository {
  create(data: Omit<Entrega, 'id' | 'criadoEm' | 'atualizadoEm'>): Promise<Entrega>;
  findById(clinicaId: string, id: string): Promise<Entrega | null>;
  listByPaciente(clinicaId: string, pacienteId: string): Promise<Entrega[]>;
  listByProcesso(clinicaId: string, processoJuridicoId: string): Promise<Entrega[]>;
  updateStatus(clinicaId: string, id: string, status: StatusEntrega): Promise<Entrega | null>;
  update(clinicaId: string, id: string, data: Partial<Entrega>): Promise<Entrega | null>;
}
