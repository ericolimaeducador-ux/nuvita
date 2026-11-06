// CONSULTA DE ENFERMAGEM (Estomaterapia), estruturada nas 5 etapas do Processo de Enfermagem da Res. Cofen 736/2024:
// avaliação, diagnóstico, planejamento, implementação e evolução. Este arquivo define só a ESTRUTURA: nenhum conteúdo
// clínico (listas de diagnósticos, escalas, termos de taxonomias) é fornecido pelo sistema — tudo é texto do enfermeiro.
// TODO(conteudo): rótulos e orientações de cada etapa entram na etapa de conteúdo.
//
// Escolha do projeto (não exigência normativa): depois de ASSINADA, a consulta fica travada; correção só por adendo.

export enum StatusConsulta {
  RASCUNHO = 'RASCUNHO',
  ASSINADA = 'ASSINADA',
}

/** Áreas dos módulos da Avaliação: definidas no pacote compartilhado (API e web usam o mesmo). */
import { AreaModuloAvaliacao } from '../../../../../../packages/shared/src/consulta';
export { AreaModuloAvaliacao };

/** Módulo da Avaliação: união discriminada por `area`; `dados` é validado pela definição registrada para a área. */
export interface ModuloAvaliacao {
  area: AreaModuloAvaliacao;
  dados: Record<string, unknown>;
}

export interface Avaliacao {
  /** Entrevista. */
  dadosSubjetivos: string;
  /** Exame físico. */
  dadosObjetivos: string;
  modulos: ModuloAvaliacao[];
}

export enum OrigemDiagnostico {
  MANUAL = 'MANUAL',
  // Reservados para a etapa 5f (sugestão por IA); nesta etapa NÃO são graváveis pela API.
  IA_ACEITA = 'IA_ACEITA',
  IA_EDITADA = 'IA_EDITADA',
}

export interface Diagnostico {
  /** Texto livre do enfermeiro. O sistema não oferece lista/taxonomia de diagnósticos. */
  texto: string;
  origem: OrigemDiagnostico;
}

export interface Planejamento {
  prioridades: string;
  resultadosEsperados: string;
  prescricaoEnfermagem: string[];
  examesSolicitados: string;
  encaminhamentos: string;
}

export enum PadraoImplementacao {
  AUTONOMO = 'AUTONOMO',
  INTERPROFISSIONAL = 'INTERPROFISSIONAL',
  PROGRAMA_SAUDE = 'PROGRAMA_SAUDE',
}

export interface RegistroImplementacao {
  padrao: PadraoImplementacao;
  descricao: string;
  registradoEm: Date;
  registradoPor: string;
}

export interface Implementacao {
  registros: RegistroImplementacao[];
}

export interface Evolucao {
  texto: string;
}

export interface AssinaturaConsulta {
  enfermeiroId: string;
  coren: string;
  dataAssinatura: Date;
  /** HMAC-SHA256 (PRONTUARIO_SIGNATURE_SECRET) sobre o conteúdo clínico + autor + COREN + data — mesmo padrão do prontuário. */
  hash: string;
}

/** Situação da cobrança da consulta, decidida na assinatura. */
export enum StatusCobrancaConsulta {
  GERADA = 'GERADA',
  INCLUIDA_EM_PACOTE = 'INCLUIDA_EM_PACOTE',
  /** A consulta foi assinada mas a cobrança ainda não foi criada (falha após a assinatura): gerar depois. */
  PENDENTE_GERACAO = 'PENDENTE_GERACAO',
}

/** Decisão de cobrança gravada NA ASSINATURA, para que a geração posterior use exatamente o mesmo valor. */
export interface CobrancaConsulta {
  incluidaEmPacote: boolean;
  /** Em centavos; ausente quando incluída em pacote. */
  valorCentavos?: number;
  status: StatusCobrancaConsulta;
  cobrancaId?: string;
}

export interface ConsultaEnfermagem {
  id: string;
  clinicaId: string;
  pacienteId: string;
  /** Autor: só ele edita o rascunho, assina e faz adendo. */
  enfermeiroId: string;
  status: StatusConsulta;
  avaliacao: Avaliacao;
  diagnosticos: Diagnostico[];
  planejamento: Planejamento;
  implementacao: Implementacao;
  evolucao: Evolucao;
  assinatura?: AssinaturaConsulta;
  cobranca?: CobrancaConsulta;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface AdendoConsulta {
  id: string;
  consultaId: string;
  clinicaId: string;
  /** Sequencial por consulta: 1, 2, 3… (índice único consultaId+numero). */
  numero: number;
  autorId: string;
  motivo: string;
  texto: string;
  criadoEm: Date;
}

export function avaliacaoVazia(): Avaliacao {
  return { dadosSubjetivos: '', dadosObjetivos: '', modulos: [] };
}

export function planejamentoVazio(): Planejamento {
  return { prioridades: '', resultadosEsperados: '', prescricaoEnfermagem: [], examesSolicitados: '', encaminhamentos: '' };
}

/** Anexo da consulta (ex.: foto/PDF do diário em papel). Conteúdo clínico: lê quem lê a consulta. Nunca é apagado. */
export interface AnexoConsulta {
  id: string;
  clinicaId: string;
  consultaId: string;
  pacienteId: string;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png';
  tamanho: number;
  hash: string;
  /** URL privada no storage (s3://bucket/chave); a chave não tem dado pessoal. */
  url: string;
  enviadoPor: string;
  /** Foto de ferida (5c): lesão a que a foto pertence. Só imagem, só com consentimento de imagem vigente. */
  lesaoId?: string;
  /** null = upload ainda não confirmado (HeadObject). */
  confirmadoEm: Date | null;
  criadoEm: Date;
}
