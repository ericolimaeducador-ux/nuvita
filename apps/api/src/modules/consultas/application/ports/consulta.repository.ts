import {
  AdendoConsulta,
  AnexoConsulta,
  AssinaturaConsulta,
  CobrancaConsulta,
  ConsultaEnfermagem,
} from '../../domain/consulta-enfermagem.entity';

export type NovaConsulta = Omit<ConsultaEnfermagem, 'id' | 'criadoEm' | 'atualizadoEm' | 'assinatura' | 'cobranca'>;

export type ConteudoConsulta = Partial<
  Pick<ConsultaEnfermagem, 'avaliacao' | 'diagnosticos' | 'planejamento' | 'implementacao' | 'evolucao'>
>;

export interface ConsultaRepository {
  create(data: NovaConsulta): Promise<ConsultaEnfermagem>;
  findById(clinicaId: string, id: string): Promise<ConsultaEnfermagem | null>;
  listByPaciente(clinicaId: string, pacienteId: string): Promise<ConsultaEnfermagem[]>;
  /** Só RASCUNHO e só do autor (condicional: rascunho assinado no meio do caminho não é alterado). */
  updateRascunho(clinicaId: string, id: string, autorId: string, conteudo: ConteudoConsulta): Promise<ConsultaEnfermagem | null>;
  /** Assinatura condicional: só RASCUNHO do autor vira ASSINADA (trava). Grava a decisão de cobrança junto. */
  assinar(
    clinicaId: string,
    id: string,
    autorId: string,
    assinatura: AssinaturaConsulta,
    cobranca: CobrancaConsulta,
  ): Promise<ConsultaEnfermagem | null>;
  /** Pós-assinatura, só a situação da COBRANÇA muda (o conteúdo clínico continua travado). */
  atualizarCobranca(clinicaId: string, id: string, cobranca: CobrancaConsulta): Promise<ConsultaEnfermagem | null>;
  listAdendos(clinicaId: string, consultaId: string): Promise<AdendoConsulta[]>;
  ultimoNumeroAdendo(clinicaId: string, consultaId: string): Promise<number>;
  /** Insere com o número informado; o índice único (consultaId, numero) faz a corrida falhar com E11000. */
  createAdendo(data: Omit<AdendoConsulta, 'id' | 'criadoEm'>): Promise<AdendoConsulta>;
  createAnexo(data: Omit<AnexoConsulta, 'id' | 'criadoEm'>): Promise<AnexoConsulta>;
  findAnexo(clinicaId: string, consultaId: string, anexoId: string): Promise<AnexoConsulta | null>;
  listAnexos(clinicaId: string, consultaId: string): Promise<AnexoConsulta[]>;
  confirmarAnexo(clinicaId: string, consultaId: string, anexoId: string, confirmadoEm: Date): Promise<AnexoConsulta | null>;
}
