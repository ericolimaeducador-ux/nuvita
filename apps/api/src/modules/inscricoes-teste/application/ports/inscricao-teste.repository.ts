import { InscricaoTeste, InscricaoTesteStatus } from '../../domain/inscricao-teste.entity';

export interface NovaInscricaoTeste {
  nome: string;
  email: string;
  whatsapp: string;
  crpNumero: string;
  cidadeEstado: string;
  modoAtendimento: string;
  ferramentaAtual?: string;
  maiorDor?: string;
  termoVersao: string;
  aceiteTermoEm: Date;
  aceiteIp: string;
  aceiteUserAgent: string;
}

export interface InscricaoTesteRepository {
  existePorEmail(email: string): Promise<boolean>;
  /** Retorna null se o e-mail já existe (índice único) — nunca lança por duplicidade. */
  criar(input: NovaInscricaoTeste): Promise<InscricaoTeste | null>;
  /** Ordem de inscrição (mais antiga primeiro). */
  listar(): Promise<InscricaoTeste[]>;
  atualizarStatus(id: string, status: InscricaoTesteStatus): Promise<InscricaoTeste | null>;
}
