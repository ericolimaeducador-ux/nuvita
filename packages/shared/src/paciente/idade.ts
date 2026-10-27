export type ClassificacaoIdade = 'maior' | 'menor' | 'indeterminado';

/** Idade da maioridade civil no Brasil (Código Civil, art. 5º). */
export const IDADE_MAIORIDADE_ANOS = 18;

/**
 * Idade exata em anos completos, por comparação de calendário — nada de
 * aproximação por dias/365.25: o corte de maioridade é no dia exato do
 * aniversário, e uma aproximação por divisão de dias erra a classificação bem
 * perto da fronteira dos 18 anos, justo o caso que mais importa aqui.
 *
 * `dataNascimento` é lida pelos getters UTC: tanto o Mongoose (campo Date
 * gravado à meia-noite UTC a partir de uma string "AAAA-MM-DD") quanto
 * `new Date('AAAA-MM-DD')` no navegador preservam o ano/mês/dia pretendido só
 * nos getters UTC — os getters locais deslocariam a data em fusos negativos
 * (Brasil = UTC-3: meia-noite UTC de um dia é 21h do dia anterior local).
 *
 * `agora` é ancorada ao dia de calendário LOCAL de quem chama (onde a pessoa
 * está "hoje" de fato), não ao instante UTC "agora" — sem isso, nas últimas
 * ~3h de cada dia num fuso como o do Brasil, "agora" em UTC já seria o dia
 * seguinte, adiantando o aniversário em até um dia.
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
 * Código de Ética Profissional do CFP + Resolução CFP nº 13/2022 — citados
 * pelo usuário; fonte ainda NÃO verificada em texto normativo primário nesta
 * sessão. Ajustar aqui, num só lugar, se a leitura jurídica confirmada
 * divergir do corte de 18 anos ou exigir uma faixa intermediária).
 *
 * 'indeterminado' quando não há data de nascimento — nunca inferido como
 * maior nem menor: pacientes sem essa informação (comum em cadastros
 * incompletos) não podem ser classificados retroativamente.
 */
export function isMenorDeIdade(
  dataNascimento: Date | null | undefined,
  agora: Date = new Date(),
): ClassificacaoIdade {
  if (!dataNascimento) return 'indeterminado';
  const idade = calcularIdadeAnos(dataNascimento, agora);
  // Nascimento no futuro é dado inválido, não "menor de idade".
  if (idade < 0) return 'indeterminado';
  return idade < IDADE_MAIORIDADE_ANOS ? 'menor' : 'maior';
}
