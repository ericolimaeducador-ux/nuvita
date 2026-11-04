import { LinhaTerapeutica, REGISTRO_PSICOLOGICO_CAMPOS, type RegistroPsicologico } from '@/types';
import { CAMPOS_POR_LINHA } from '@/lib/linhaTerapeutica';

/**
 * FONTE ÚNICA de rótulos e de ordem do registro de atendimento psicológico: o formulário, a tela de leitura e o PDF
 * leem daqui. Antes, cada um tinha o seu texto ("Registro de Pensamentos Disfuncionais" no formulário, "Pensamentos
 * automáticos identificados" no PDF) e quem lia o PDF não conseguia ligar o campo ao que tinha digitado.
 */
export type FormularioRegistro = 'completo' | 'seguimento';
type Chave = keyof RegistroPsicologico;

/** Ordem do formulário completo (avaliação inicial), sem os campos da linha terapêutica nem as anotações. */
export const CAMPOS_COMPLETO: Array<{ key: Chave; label: string }> = [
  { key: 'motivoAtendimento', label: 'Motivo do atendimento / queixa principal' },
  { key: 'avaliacaoDemanda', label: 'Avaliação de demanda' },
  { key: 'doencasPrevias', label: 'Doenças prévias / condições de saúde' },
  { key: 'diagnosticosSaudeMental', label: 'Diagnósticos de saúde mental (prévios ou atuais)' },
  { key: 'medicamentosEmUso', label: 'Medicamentos em uso' },
  { key: 'historicoFamiliarSaudeMental', label: 'Histórico familiar de saúde mental' },
  { key: 'qualidadeSono', label: 'Qualidade do sono' },
  { key: 'apetiteAlimentacao', label: 'Apetite / alimentação' },
  { key: 'atividadeFisica', label: 'Atividade física' },
  { key: 'usoSubstancias', label: 'Uso de álcool, tabaco e outras substâncias' },
  { key: 'estadoEmocional', label: 'Estado emocional / sentimentos relatados e afeto observado' },
  { key: 'escalaDor', label: 'Dor (0 a 10)' },
  { key: 'redeApoio', label: 'Rede de apoio familiar / social' },
  { key: 'avaliacaoRisco', label: 'Avaliação de risco (ideação suicida, autolesão, risco a terceiros)' },
  { key: 'objetivosTrabalho', label: 'Objetivos do acompanhamento' },
  { key: 'procedimentoTecnica', label: 'Procedimento / técnica utilizada' },
  { key: 'evolucao', label: 'Evolução' },
  { key: 'encaminhamentos', label: 'Encaminhamentos' },
];

/** Rótulo de cada campo do formulário completo (o formulário usa isto em vez de texto solto). */
export const ROTULO: Record<string, string> = Object.fromEntries(CAMPOS_COMPLETO.map((c) => [c.key, c.label]));

export const ROTULO_ANOTACOES: Record<FormularioRegistro, string> = {
  completo: 'Anotações livres da sessão',
  seguimento: 'Anotações da psicoterapia',
};

const CHAVES_SO_DO_COMPLETO = new Set<Chave>(CAMPOS_COMPLETO.map((c) => c.key));

/**
 * Qual formulário foi usado. Hoje o registro não guarda isso, então é INFERIDO: se há algum campo que só existe na
 * avaliação inicial, foi o completo; senão, o de seguimento. (Quando o tipo do formulário passar a ser gravado, isto
 * vira só a leitura do campo gravado.)
 */
export function formularioUsado(registro?: RegistroPsicologico | null): FormularioRegistro {
  if (!registro) return 'seguimento';
  const preenchido = (v: unknown) => v !== undefined && v !== null && String(v).trim() !== '';
  return [...CHAVES_SO_DO_COMPLETO].some((k) => preenchido(registro[k])) ? 'completo' : 'seguimento';
}

/** O formulário do registro: o GRAVADO quando existe; nos registros antigos, o inferido. */
export function formularioDoRegistro(pr?: { formulario?: FormularioRegistro; registroPsicologico?: RegistroPsicologico | null } | null): FormularioRegistro {
  return pr?.formulario ?? formularioUsado(pr?.registroPsicologico);
}

export const ROTULO_FORMULARIO: Record<FormularioRegistro, string> = { completo: 'Avaliação inicial', seguimento: 'Seguimento' };

/** Os campos do formulário usado, na ordem em que aparecem nele (campos da linha terapêutica antes das anotações). */
export function camposDoFormulario(
  formulario: FormularioRegistro,
  linha?: LinhaTerapeutica | null,
): Array<{ key: Chave; label: string }> {
  const daLinha = linha ? CAMPOS_POR_LINHA[linha].map(({ key, label }) => ({ key, label })) : [];
  const anotacoes = { key: 'anotacoesLivres' as Chave, label: ROTULO_ANOTACOES[formulario] };
  return formulario === 'completo' ? [...CAMPOS_COMPLETO, ...daLinha, anotacoes] : [...daLinha, anotacoes];
}

/** A linha terapêutica do registro, deduzida dos campos específicos preenchidos (a tela de leitura não conhece o paciente). */
export function linhaDoRegistro(registro?: RegistroPsicologico | null): LinhaTerapeutica | undefined {
  if (!registro) return undefined;
  return (Object.values(LinhaTerapeutica) as LinhaTerapeutica[]).find((linha) =>
    CAMPOS_POR_LINHA[linha].some(({ key }) => String(registro[key] ?? '').trim() !== ''),
  );
}

/** Rótulo de QUALQUER chave do registro (conteúdo gravado fora do formulário usado também usa o texto do formulário). */
export function rotuloDoCampo(key: Chave): string {
  if (key === 'coren') return 'COREN digitado no registro (não carimbado)';
  if (ROTULO[key]) return ROTULO[key];
  for (const linha of Object.values(LinhaTerapeutica) as LinhaTerapeutica[]) {
    const achado = CAMPOS_POR_LINHA[linha].find((c) => c.key === key);
    if (achado) return achado.label;
  }
  return REGISTRO_PSICOLOGICO_CAMPOS.find(([k]) => k === key)?.[1] ?? String(key);
}
