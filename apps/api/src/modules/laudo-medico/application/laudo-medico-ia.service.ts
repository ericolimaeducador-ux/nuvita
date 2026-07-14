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
  contextoSocial: string;
  etiologia: string;
  nivelLesao: string;
  diagnosticoFuncional: string;
  regimeCil: string;
  insumoAtual: string;
  fornecedorAtual: string;
}

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    cid10: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    contextoSocial: { type: SchemaType.STRING },
    etiologia: { type: SchemaType.STRING },
    nivelLesao: { type: SchemaType.STRING },
    diagnosticoFuncional: { type: SchemaType.STRING },
    regimeCil: { type: SchemaType.STRING },
    insumoAtual: { type: SchemaType.STRING },
    fornecedorAtual: { type: SchemaType.STRING },
  },
  required: ['cid10', 'etiologia', 'diagnosticoFuncional', 'regimeCil', 'insumoAtual'],
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

    return `Você ajuda um enfermeiro a redigir o RASCUNHO de um Relatório Médico Circunstanciado (CIL — Cateterismo Intermitente Limpo), que depois será revisado e assinado por um médico. O texto final é um documento narrativo fixo em que cada campo abaixo é encaixado dentro de frases prontas — por isso cada campo deve ser um FRAGMENTO GRAMATICAL (não uma frase completa com sujeito próprio), sem ponto final, sem maiúscula inicial (exceto siglas/nomes próprios), no mesmo registro técnico-jurídico dos exemplos abaixo. NUNCA invente dado clínico — use somente os dados fornecidos sobre o paciente.

Preencha:
- "cid10": lista de códigos CID-10 já mencionados nos dados (vazio se nenhum constar).
- "etiologia": causa primária da disfunção. Ex.: "trauma raquimedular com lesão medular irreversível decorrente de acidente automobilístico".
- "nivelLesao": nível da lesão medular, se houver e estiver documentado. Ex.: "em terceira e quarta vértebras cervicais (C3–C4)". Retorne "" se não houver nível medular aplicável/documentado.
- "diagnosticoFuncional": diagnóstico funcional resultante. Ex.: "Disfunção Neurogênica do Trato Urinário Inferior (DNTUI — CID N31), com bexiga neurogênica secundária".
- "regimeCil": regime de cateterismo intermitente limpo prescrito/necessário. Ex.: "a cada 4 (quatro) horas, totalizando 6 (seis) cateterismos ao dia".
- "insumoAtual": o cateter/insumo em uso atualmente e suas características. Ex.: "cateter convencional (sonda uretral), sem lubrificação ou proteção".
- "fornecedorAtual": preposição + quem fornece o insumo atual, se mencionado (o texto final é "...fornecido {fornecedorAtual}"). Ex.: "pelo SUS". Retorne "" se não houver menção.
- "contextoSocial": contexto social/laboral do paciente, se relevante e documentado. Ex.: "vida social ativa e exerce atividade laboral". Retorne "" se não houver dado sobre isso.

Regra obrigatória: para "etiologia", "diagnosticoFuncional", "regimeCil" e "insumoAtual" — indispensáveis à validade do relatório — se a informação não estiver sustentada pelos dados abaixo, retorne literalmente o marcador "${PLACEHOLDER}" como valor do campo, substituindo <tema> pelo assunto específico que falta (ex.: "${PLACEHOLDER.replace('<tema>', 'etiologia/causa da lesão medular')}"). Não tente adivinhar ou inferir. Para os campos opcionais ("nivelLesao", "fornecedorAtual", "contextoSocial"), prefira retornar "" a usar o marcador, a menos que o dado seja claramente relevante e esteja só parcialmente ausente.

Dados disponíveis:

${blocos}`;
  }
}
