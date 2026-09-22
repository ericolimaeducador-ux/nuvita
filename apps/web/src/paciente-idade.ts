// ⚠️ SINCRONIA MANUAL com packages/shared/src/paciente/idade.ts (mesmo padrão já
// usado para `Papel` em @/types — ver comentário em auth/GateChain.tsx): o web não
// importa packages/shared diretamente (sem alias no vite.config.ts), então esta
// função é uma cópia fiel da de lá. Ao mexer numa, mexer na outra — a classificação
// de maioridade precisa bater entre o que o formulário mostra em tempo real e o que
// o backend valida, senão a tela libera um cadastro que a API vai rejeitar (ou vice-versa).

export type ClassificacaoIdade = 'maior' | 'menor' | 'indeterminado';

/** Idade da maioridade civil no Brasil (Código Civil, art. 5º). */
export const IDADE_MAIORIDADE_ANOS = 18;

/**
 * Idade exata em anos completos, por comparação de calendário — nada de
 * aproximação por dias/365.25 (o `idade()` de exibição em utils.ts usava essa
 * aproximação antes desta mudança; passou a usar esta função, mais precisa,
 * perto da fronteira de 18 anos).
 *
 * `dataNascimento` é lida pelos getters UTC: `new Date('AAAA-MM-DD')` preserva o
 * ano/mês/dia pretendido só nos getters UTC — os getters locais deslocariam a data
 * em fusos negativos (Brasil = UTC-3: meia-noite UTC de um dia é 21h do dia anterior
 * local). `agora` é ancorada ao dia de calendário LOCAL do navegador (onde a pessoa
 * está "hoje" de fato).
 */
export function calcularIdadeAnos(dataNascimento: Date, agora: Date = new Date()): number {
  const hoje = new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate()));

  let idade = hoje.getUTCFullYear() - dataNascimento.getUTCFullYear();
  const aindaNaoFezAniversario =
    hoje.getUTCMonth() < dataNascimento.getUTCMonth() ||
    (hoje.getUTCMonth() === dataNascimento.getUTCMonth() && hoje.getUTCDate() < dataNascimento.getUTCDate());
  if (aindaNaoFezAniversario) idade--;

  return idade;
}

/**
 * Classificação de maioridade para a regra de responsável legal (Art. 8º do
 * Código de Ética Profissional do CFP + Resolução CFP nº 13/2022 — fonte ainda
 * não verificada em texto normativo primário; ajustar aqui E em
 * packages/shared/src/paciente/idade.ts, juntas, se a leitura jurídica
 * confirmada divergir). 'indeterminado' quando não há data de nascimento.
 */
export function isMenorDeIdade(
  dataNascimento: Date | null | undefined,
  agora: Date = new Date(),
): ClassificacaoIdade {
  if (!dataNascimento) return 'indeterminado';
  return calcularIdadeAnos(dataNascimento, agora) < IDADE_MAIORIDADE_ANOS ? 'menor' : 'maior';
}

/** Classifica a partir da string ISO (date-only) como a API grava/devolve `dataNascimento`. */
export function classificarIdadePorString(dataNascimentoIso?: string | null): ClassificacaoIdade {
  if (!dataNascimentoIso) return 'indeterminado';
  const data = new Date(dataNascimentoIso);
  return Number.isNaN(data.getTime()) ? 'indeterminado' : isMenorDeIdade(data);
}
