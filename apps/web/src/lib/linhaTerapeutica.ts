import { LinhaTerapeutica, type RegistroPsicologico } from '@/types';

/** Campos específicos de sessão por linha terapêutica — injetados no
 * formulário de Atendimento Psicológico quando o paciente tem uma linha
 * definida, e usados para exibir/imprimir esses campos quando presentes.
 * Conteúdo baseado no guia comparativo de abordagens psicoterapêuticas
 * (técnicas clínicas de cada linha) — mesmas 17 chaves já persistidas em
 * RegistroPsicologico, só os rótulos foram aprofundados. */
export const CAMPOS_POR_LINHA: Record<
  LinhaTerapeutica,
  Array<{ key: keyof RegistroPsicologico; label: string; placeholder?: string }>
> = {
  [LinhaTerapeutica.TCC]: [
    {
      key: 'tccPensamentosAutomaticos',
      label: 'Registro de Pensamentos Disfuncionais (RPD)',
      placeholder: 'Situação → pensamento automático (%crença) → emoção (%intensidade) → resposta alternativa',
    },
    {
      key: 'tccDistorcoesCognitivas',
      label: 'Distorções cognitivas identificadas',
      placeholder: 'Ex.: catastrofização, leitura mental, tudo-ou-nada, adivinhação do futuro, filtro negativo',
    },
    {
      key: 'tccTarefaCasa',
      label: 'Tarefa de casa prescrita',
      placeholder: 'RPD, exposição gradual (hierarquia SUDS), experimento comportamental, tabela de prazer/mestria',
    },
    {
      key: 'tccRegistroComportamental',
      label: 'Técnica aplicada na sessão e evolução',
      placeholder: 'Questionamento socrático, descatastrofização, EPR, desensibilização sistemática, seta descendente',
    },
  ],
  [LinhaTerapeutica.PSICANALISE]: [
    {
      key: 'psicanaliseAssociacaoLivre',
      label: 'Material de associação livre',
      placeholder: 'Conteúdo verbalizado sem filtro; fraturas do discurso (pausas, trocas de palavras, contradições)',
    },
    {
      key: 'psicanaliseConteudoOnirico',
      label: 'Conteúdo onírico relatado',
      placeholder: 'Conteúdo manifesto do sonho e associações do paciente sobre seus elementos',
    },
    {
      key: 'psicanaliseDinamicaTransferencial',
      label: 'Transferência e contratransferência observadas',
      placeholder: 'Repetição de padrões relacionais infantis/imagos parentais na relação com o analista',
    },
    {
      key: 'psicanaliseRepeticoes',
      label: 'Resistências, atos falhos e repetições',
      placeholder: 'Atrasos, esquecimentos, lapsos de fala, intelectualização, padrões repetitivos identificados',
    },
  ],
  [LinhaTerapeutica.HUMANISTA]: [
    {
      key: 'humanistaCongruencia',
      label: 'Incongruência entre autoconceito e experiência organísmica',
      placeholder: 'Onde o paciente se sente dividido entre o que "deveria" sentir e o que sente de fato',
    },
    {
      key: 'humanistaAutorrealizacao',
      label: 'Movimento em direção à tendência atualizante',
      placeholder: 'Sinais de reorganização do self, autonomia crescente, locus de avaliação interno',
    },
    {
      key: 'humanistaAcolhimento',
      label: 'Reflexão de sentimentos e checagem de compreensão empática',
      placeholder: 'Afeto subjacente devolvido ao paciente e validação/ajuste feito por ele',
    },
  ],
  [LinhaTerapeutica.GESTALT]: [
    {
      key: 'gestaltAwareness',
      label: 'Awareness no aqui-e-agora',
      placeholder: 'O que emergiu na sessão ao trazer a experiência para o momento presente',
    },
    {
      key: 'gestaltFiguraFundo',
      label: 'Figura-fundo / necessidade emergente',
      placeholder: 'Gestalt aberta (situação inacabada) identificada e trabalhada na sessão',
    },
    {
      key: 'gestaltContatoFronteira',
      label: 'Bloqueio de contato e técnica utilizada',
      placeholder: 'Introjeção, projeção, retroflexão, confluência ou deflexão; cadeira vazia, dramatização, exagero expressivo',
    },
  ],
  [LinhaTerapeutica.JUNGUIANA]: [
    {
      key: 'junguianaSimbolosArquetipicos',
      label: 'Símbolos e conteúdos arquetípicos trabalhados',
      placeholder: 'Ampliação de símbolos, paralelos mitológicos, mitos pessoais',
    },
    {
      key: 'junguianaMaterialOnirico',
      label: 'Material onírico / imaginação ativa relatado',
      placeholder: 'Sonhos, figuras dialogadas em imaginação ativa, produções de sandplay ou mandalas',
    },
    {
      key: 'junguianaProcessoIndividuacao',
      label: 'Fase do processo e complexos identificados',
      placeholder: 'Catarse, esclarecimento, educação ou transformação; complexo materno/paterno/inferioridade etc.',
    },
  ],
};

/** Sugestões de cuidados por linha terapêutica — usadas na Prescrição de
 * Cuidados (documento clínico) para pré-carregar itens sugeridos. Baseadas
 * nas prescrições/exercícios reais de cada abordagem (lado do paciente). */
export const SUGESTOES_CUIDADOS_POR_LINHA: Record<LinhaTerapeutica, string[]> = {
  [LinhaTerapeutica.TCC]: [
    'Diário de Registro de Pensamentos Automáticos (RPD)',
    'Aterramento sensorial 5-4-3-2-1 e respiração diafragmática',
    'Cartão de enfrentamento (coping card) para momentos de crise',
    'Tabela de agendamento de atividades — prazer e mestria',
    'Exposição gradual com registro de nível de ansiedade (escala SUDS)',
  ],
  [LinhaTerapeutica.PSICANALISE]: [
    'Diário de sonhos e associações pessoais',
    'Auto-observação de lapsos, repetições e atos falhos',
    'Escrita associativa livre antes da sessão (10 min, sem censura)',
  ],
  [LinhaTerapeutica.HUMANISTA]: [
    'Diário de experienciação organísmica, sem julgamento',
    'Mapeamento do locus de avaliação (o que os outros esperam vs. o que eu sinto)',
    'Pausa de foco no referencial interno (focalização corporal)',
  ],
  [LinhaTerapeutica.GESTALT]: [
    'Continuum de consciência — awareness no aqui-e-agora',
    'Registro de introjetos: "eu devo" vs. "eu quero"',
    'Diário sensorial do aqui-e-agora (o que vejo, ouço, sinto agora)',
    'Exercício "eu assumo a responsabilidade por..."',
  ],
  [LinhaTerapeutica.JUNGUIANA]: [
    'Diário de sonhos associativo',
    'Pintura de mandalas para reorganização interna',
    'Escrita dialógica com figuras do inconsciente (ex.: o Crítico Interno)',
    'Mapeamento da jornada do herói / linha do tempo pessoal',
  ],
};
