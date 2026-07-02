import { CursorPaginationInput, CursorPaginationResult } from '../../domain/pagination';
import { Paciente } from '../../domain/paciente.entity';

export type CreatePacienteInput = Omit<Paciente, 'id' | 'ativo' | 'criadoEm' | 'atualizadoEm'>;

export type UpdatePacienteInput = Partial<
  Omit<Paciente, 'id' | 'clinicaId' | 'ativo' | 'criadoEm' | 'atualizadoEm' | 'consentimentoLGPD'>
>;

export interface ListPacientesInput extends CursorPaginationInput {
  clinicaId: string;
  incluirInativos?: boolean;
  programaIU?: boolean;
}

export interface SearchPacientesByNameInput extends ListPacientesInput {
  nome: string;
}

export interface PacienteRepository {
  create(input: CreatePacienteInput): Promise<Paciente>;
  list(input: ListPacientesInput): Promise<CursorPaginationResult<Paciente>>;
  searchByName(input: SearchPacientesByNameInput): Promise<CursorPaginationResult<Paciente>>;
  findByCpf(clinicaId: string, cpf: string, incluirInativos?: boolean): Promise<Paciente | null>;
  findById(clinicaId: string, pacienteId: string, incluirInativos?: boolean): Promise<Paciente | null>;
  update(clinicaId: string, pacienteId: string, input: UpdatePacienteInput): Promise<Paciente | null>;
  deactivate(clinicaId: string, pacienteId: string): Promise<Paciente | null>;
}
