import { TipoDocumentoFiscal } from '../../../../../../../packages/shared/src/documentos';
import { Clinica } from '../../domain/clinica.entity';
import { CreateClinicaDto } from '../dto/create-clinica.dto';

/** Documento opcional: a clínica criada pelo super-admin pode nascer sem ele (feature-clinic-fiscal-document-first-use). */
export type CreateClinicaInput = Omit<CreateClinicaDto, 'primeiroAdmin' | 'documento' | 'tipoDocumento'> & {
  documento?: string;
  tipoDocumento?: TipoDocumentoFiscal;
};

export interface UpdateClinicaInput {
  nome?: string;
  plano?: Clinica['plano'];
  ativo?: boolean;
  faseTeste?: boolean;
  /** Gravados em configuracoes.* (dotted path), sem trocar o objeto inteiro. */
  telefone?: string;
  emailContato?: string;
  /** Identidade fiscal (só o SUPER_ADMIN altera): gravada normalizada, no par. */
  documento?: string;
  tipoDocumento?: TipoDocumentoFiscal;
  /** configuracoes.logoKey: string define/troca; null remove. */
  logoKey?: string | null;
}

export interface ClinicaRepository {
  create(input: CreateClinicaInput): Promise<Clinica>;
  findById(id: string): Promise<Clinica | null>;
  /** Busca pelo documento fiscal (CPF ou CNPJ), em qualquer formatação. */
  findByDocumento(documento: string): Promise<Clinica | null>;
  findAll(): Promise<Clinica[]>;
  update(id: string, input: UpdateClinicaInput): Promise<Clinica | null>;
  /**
   * Primeiro uso: grava documento + tipo SÓ se a clínica ainda não tem documento (o filtro do update é a trava, atômica).
   * Devolve null quando já estava preenchido (ou a clínica não existe).
   */
  preencherDocumentoSeVazio(id: string, documento: string, tipoDocumento: TipoDocumentoFiscal): Promise<Clinica | null>;
  /** Usado só para compensar onboarding parcial (admin não criado). Não é operação de produto. */
  delete(id: string): Promise<void>;
}
