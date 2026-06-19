import { Clinica } from '../../domain/clinica.entity';
import { CreateClinicaDto } from '../dto/create-clinica.dto';

export type CreateClinicaInput = Omit<CreateClinicaDto, 'primeiroAdmin'>;

export interface ClinicaRepository {
  create(input: CreateClinicaInput): Promise<Clinica>;
  findById(id: string): Promise<Clinica | null>;
  findByCnpj(cnpj: string): Promise<Clinica | null>;
}
