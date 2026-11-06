import { ConsentimentoImagem, CorrecaoLesao, IdentificacaoLesao, Lesao, StatusLesao } from '../../domain/lesao.entity';

export type NovaLesao = Omit<Lesao, 'id' | 'criadaEm' | 'atualizadaEm' | 'correcoes' | 'versao' | 'status'>;

export interface MudancaStatusLesao {
  status: Exclude<StatusLesao, 'ABERTA'>;
  motivoEncerramento?: string;
  consultaId: string;
  por: string;
  em: Date;
}

export interface LesaoRepository {
  /** Insere com o número informado; o índice único (pacienteId, numero) faz a corrida falhar com E11000. */
  create(data: NovaLesao): Promise<Lesao>;
  ultimoNumero(clinicaId: string, pacienteId: string): Promise<number>;
  findById(clinicaId: string, id: string): Promise<Lesao | null>;
  listByPaciente(clinicaId: string, pacienteId: string): Promise<Lesao[]>;
  /** Correção versionada: só aplica se a versão gravada for a esperada (senão null). */
  corrigir(clinicaId: string, id: string, versaoEsperada: number, identificacao: IdentificacaoLesao, correcao: CorrecaoLesao): Promise<Lesao | null>;
  /** Condicional: só muda lesão ABERTA (senão null). */
  alterarStatus(clinicaId: string, id: string, mudanca: MudancaStatusLesao): Promise<Lesao | null>;

  createConsentimento(data: Omit<ConsentimentoImagem, 'id' | 'criadoEm' | 'revogadoEm' | 'revogadoPor'>): Promise<ConsentimentoImagem>;
  /** O vigente é o não revogado (no máximo um por paciente — regra do serviço). */
  consentimentoVigente(clinicaId: string, pacienteId: string): Promise<ConsentimentoImagem | null>;
  listConsentimentos(clinicaId: string, pacienteId: string): Promise<ConsentimentoImagem[]>;
  /** Condicional: só revoga o que ainda não foi revogado (senão null). */
  revogarConsentimento(clinicaId: string, id: string, por: string, em: Date): Promise<ConsentimentoImagem | null>;
}
