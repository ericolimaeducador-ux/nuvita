import { Inject, Injectable } from '@nestjs/common';
import { SchemaType } from '@google/generative-ai';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { AvaliacaoIUService } from '../../avaliacao-iu/application/avaliacao-iu.service';
import { ProntuariosService } from '../../prontuarios/application/prontuarios.service';
import { FollowUpService } from '../../followup/application/followup.service';
import { ObservacoesPacienteService } from '../../observacoes-paciente/application/observacoes-paciente.service';
import { ProcessoJuridicoService } from '../../processo-juridico/application/processo-juridico.service';
import { AnotacoesJuridicasService } from '../../anotacoes-juridicas/application/anotacoes-juridicas.service';
import { AI_TEXT_GENERATOR } from '../laudo-medico.constants';
import { AiTextGenerator } from './ports/ai-text-generator';

const PLACEHOLDER = '[preenchimento do enfermeiro sobre: <tema>]';

export interface RascunhoLaudoIA {
  cid10: string[];
  justificativaMedica: string;
  fundamentoLegal: string;
}

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    cid10: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    justificativaMedica: { type: SchemaType.STRING },
    fundamentoLegal: { type: SchemaType.STRING },
  },
  required: ['cid10', 'justificativaMedica', 'fundamentoLegal'],
};

@Injectable()
export class LaudoMedicoIaService {
  constructor(
    private readonly pacientesService: PacientesService,
    private readonly avaliacaoIuService: AvaliacaoIUService,
    private readonly prontuariosService: ProntuariosService,
    private readonly followUpService: FollowUpService,
    private readonly observacoesPacienteService: ObservacoesPacienteService,
    private readonly processoJuridicoService: ProcessoJuridicoService,
    private readonly anotacoesJuridicasService: AnotacoesJuridicasService,
    @Inject(AI_TEXT_GENERATOR) private readonly ia: AiTextGenerator,
  ) {}

  async gerarRascunho(
    pacienteId: string,
    avaliacaoIuId: string,
    clinicaId: string | undefined,
    user: AuthTokenPayload,
  ): Promise<RascunhoLaudoIA> {
    const contexto = { ip: 'internal', userAgent: 'laudo-medico-ia', user };

    const [paciente, avaliacoes, prontuarios, followups, observacoes, processos, anotacoes] = await Promise.all([
      this.pacientesService.findOne(pacienteId, clinicaId, contexto),
      this.avaliacaoIuService.listByPaciente(pacienteId, clinicaId, user),
      this.prontuariosService.listByPaciente({ pacienteId, clinicaId }, contexto),
      this.followUpService.listByPaciente(pacienteId, clinicaId, user),
      this.observacoesPacienteService.listByPaciente(pacienteId, clinicaId, user),
      this.processoJuridicoService.listByPaciente(pacienteId, clinicaId, user),
      this.anotacoesJuridicasService.listByPaciente(pacienteId, clinicaId, user),
    ]);

    const avaliacao = avaliacoes.find((a) => a.id === avaliacaoIuId) ?? avaliacoes[0];

    const prompt = this.montarPrompt({ paciente, avaliacao, prontuarios, followups, observacoes, processos, anotacoes });
    return this.ia.gerarJson<RascunhoLaudoIA>(prompt, RESPONSE_SCHEMA);
  }

  private montarPrompt(dados: {
    paciente: unknown;
    avaliacao?: unknown;
    prontuarios: unknown[];
    followups: unknown[];
    observacoes: unknown[];
    processos: unknown[];
    anotacoes: unknown[];
  }): string {
    const { paciente, avaliacao, prontuarios, followups, observacoes, processos, anotacoes } = dados;

    const blocos = [
      `Paciente: ${JSON.stringify(paciente)}`,
      avaliacao ? `Avaliação de incontinência urinária mais recente: ${JSON.stringify(avaliacao)}` : 'Sem avaliação de incontinência urinária registrada.',
      prontuarios.length ? `Prontuários (SOAP, do mais recente): ${JSON.stringify(prontuarios)}` : 'Sem prontuários registrados.',
      followups.length ? `Follow-ups: ${JSON.stringify(followups)}` : 'Sem follow-ups registrados.',
      observacoes.length ? `Observações livres da equipe: ${JSON.stringify(observacoes)}` : 'Sem observações livres.',
      processos.length ? `Processo(s) jurídico(s) já em andamento: ${JSON.stringify(processos)}` : 'Sem processo jurídico em andamento.',
      anotacoes.length ? `Anotações jurídicas: ${JSON.stringify(anotacoes)}` : 'Sem anotações jurídicas.',
    ].join('\n\n');

    return `Você ajuda um enfermeiro a redigir o RASCUNHO de um Relatório Médico Judiciário (solicitação de insumo/medicamento/procedimento ao SUS ou à Justiça), que depois será revisado e assinado por um médico. NUNCA invente dado clínico. Use somente os dados fornecidos abaixo sobre o paciente.

Preencha:
- "cid10": lista de códigos CID-10 já mencionados nos dados (vazio se nenhum constar).
- "justificativaMedica": texto corrido justificando a necessidade médica, com base nos dados existentes (histórico, diagnóstico, tratamentos realizados, tentativas anteriores).
- "fundamentoLegal": base legal (ex.: Lei 8.080/90, jurisprudência do NAT-JUS, direito à saúde constitucional) apropriada ao tipo de solicitação identificado nos dados.

Regra obrigatória: para qualquer informação juridicamente relevante (ex.: urgência do caso, imprescindibilidade do item solicitado, consequências da não utilização, benefícios esperados, tentativas de tratamento alternativas) que NÃO esteja sustentada pelos dados abaixo, escreva literalmente dentro do texto o marcador "${PLACEHOLDER}" substituindo <tema> pelo assunto específico que falta (ex.: "${PLACEHOLDER.replace('<tema>', 'urgência do caso')}"). Não tente adivinhar ou inferir isso.

Dados disponíveis:

${blocos}`;
  }
}
