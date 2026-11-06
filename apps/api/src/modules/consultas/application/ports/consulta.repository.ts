import {
  AdendoConsulta,
  AnexoConsulta,
  AssinaturaConsulta,
  CobrancaConsulta,
  ConsultaEnfermagem,
  IdentificacaoLesaoRegistrada,
  StatusDesfechoLesoes,
} from '../../domain/consulta-enfermagem.entity';

export type NovaConsulta = Omit<
  ConsultaEnfermagem,
  'id' | 'criadoEm' | 'atualizadoEm' | 'assinatura' | 'cobranca' | 'desfechoLesoesStatus' | 'versao' | 'identificacoesLesoes' | 'auditoriaAssinaturaPendente'
>;

export type ConteudoConsulta = Partial<
  Pick<ConsultaEnfermagem, 'avaliacao' | 'diagnosticos' | 'planejamento' | 'implementacao' | 'evolucao'>
>;

export interface ConsultaRepository {
  create(data: NovaConsulta): Promise<ConsultaEnfermagem>;
  findById(clinicaId: string, id: string): Promise<ConsultaEnfermagem | null>;
  listByPaciente(clinicaId: string, pacienteId: string): Promise<ConsultaEnfermagem[]>;
  /**
   * Só RASCUNHO, só do autor e só na VERSÃO esperada (condicional); incrementa a versão. null = assinada no meio do
   * caminho ou alterada em outra tela (nada é sobrescrito).
   */
  updateRascunho(clinicaId: string, id: string, autorId: string, versaoEsperada: number, conteudo: ConteudoConsulta): Promise<ConsultaEnfermagem | null>;
  /**
   * Assinatura condicional: só RASCUNHO do autor NA VERSÃO cujo conteúdo foi selado vira ASSINADA (trava). Grava a
   * decisão de cobrança e a identificação das lesões junto. Impossível gravar o selo de A com o conteúdo de B.
   */
  assinar(
    clinicaId: string,
    id: string,
    autorId: string,
    versaoEsperada: number,
    assinatura: AssinaturaConsulta,
    cobranca: CobrancaConsulta,
    identificacoesLesoes?: IdentificacaoLesaoRegistrada[],
  ): Promise<ConsultaEnfermagem | null>;
  /** Marca/limpa a pendência de auditoria da assinatura (consulta assinada). */
  marcarAuditoriaAssinatura(clinicaId: string, id: string, pendente: boolean): Promise<void>;
  /** Pós-assinatura, só a situação da COBRANÇA muda (o conteúdo clínico continua travado). */
  atualizarCobranca(clinicaId: string, id: string, cobranca: CobrancaConsulta): Promise<ConsultaEnfermagem | null>;
  /** Pós-assinatura: situação da aplicação do desfecho nas lesões (o conteúdo clínico continua travado). */
  atualizarDesfechoLesoes(clinicaId: string, id: string, status: StatusDesfechoLesoes): Promise<ConsultaEnfermagem | null>;
  listAdendos(clinicaId: string, consultaId: string): Promise<AdendoConsulta[]>;
  ultimoNumeroAdendo(clinicaId: string, consultaId: string): Promise<number>;
  /** Insere com o número informado; o índice único (consultaId, numero) faz a corrida falhar com E11000. */
  createAdendo(data: Omit<AdendoConsulta, 'id' | 'criadoEm'>): Promise<AdendoConsulta>;
  createAnexo(data: Omit<AnexoConsulta, 'id' | 'criadoEm'>): Promise<AnexoConsulta>;
  findAnexo(clinicaId: string, consultaId: string, anexoId: string): Promise<AnexoConsulta | null>;
  listAnexos(clinicaId: string, consultaId: string): Promise<AnexoConsulta[]>;
  confirmarAnexo(clinicaId: string, consultaId: string, anexoId: string, confirmadoEm: Date): Promise<AnexoConsulta | null>;
}
