import { Clinica } from '../../domain/clinica.entity';
import { CreateClinicaDto } from '../dto/create-clinica.dto';

export type CreateClinicaInput = Omit<CreateClinicaDto, 'primeiroAdmin'>;

export interface UpdateClinicaInput {
  nome?: string;
  plano?: Clinica['plano'];
  ativo?: boolean;
}

export interface ClinicaRepository {
  create(input: CreateClinicaInput): Promise<Clinica>;
  findById(id: string): Promise<Clinica | null>;
  /** Busca pelo documento fiscal (CPF ou CNPJ), em qualquer formatação. */
  findByDocumento(documento: string): Promise<Clinica | null>;
  findAll(): Promise<Clinica[]>;
  update(id: string, input: UpdateClinicaInput): Promise<Clinica | null>;
  /** Usado só para compensar onboarding parcial (admin não criado). Não é operação de produto. */
  delete(id: string): Promise<void>;
}
