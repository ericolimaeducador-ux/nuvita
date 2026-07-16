import dayjs from 'dayjs';
import { Sexo, SEXO_LABEL, type ComparativoAnvisa, type LaudoMedico, type Paciente, type Produto } from '@/types';

/**
 * Monta a narrativa fixa+variável do "Relatório Médico Circunstanciado" (CIL —
 * Cateterismo Intermitente Limpo), portando 1:1 a lógica de `gerar()` do
 * gerador de referência (gerador_relatorio_pericial_CIL.html) para os campos
 * estruturados do Nuvita. Usado tanto pela pré-visualização em tela quanto
 * pelo gerador de .docx (LaudoImpressaoPage.tsx) — para não duplicar a lógica
 * narrativa em dois lugares.
 *
 * Nota de propriedade intelectual: o modelo de referência cita a marca real do
 * cateter prescrito ("Cateter VaPro, fabricante Hollister") na cláusula de
 * independência de marca. O Nuvita nunca expõe nome de fabricante no sistema
 * (só rótulos neutros do catálogo — ver produto.entity.ts) — por isso aqui
 * usamos sempre `produto.nome`/`produto.codigoFabricante` do catálogo, nunca
 * uma marca hardcoded. A Seção VI (comparativo ANVISA) é uma exceção
 * deliberada: ali o nome citado é de um produto de TERCEIROS oferecido pelo
 * ente público, não o produto que o Nuvita indica — nomeá-lo é o próprio
 * propósito da seção.
 */

export interface Run {
  text: string;
  bold?: boolean;
  /** Campo obrigatório não preenchido — estilo "vazio" do modelo de referência. */
  missing?: boolean;
}

export type LaudoNode =
  | { type: 'heading'; text: string }
  | { type: 'objetivoBox'; runs: Run[] }
  | { type: 'paragraph'; runs: Run[]; noIndent?: boolean }
  | { type: 'subheading'; text: string }
  | { type: 'list'; items: Run[][] }
  | { type: 'signature'; local: Run[]; nomeMedico: Run[]; especialidadeCrm: Run[] };

const COMPARATIVOS_ANVISA: Record<ComparativoAnvisa, {
  nome: string; fabricante: string; registro: string; ponta: string; manga: string; prontoUso: string;
}> = {
  speedicath: {
    nome: 'SpeediCath',
    fabricante: 'Coloplast',
    registro: '10430310037',
    ponta: 'O cateter SpeediCath não possui ponta protetora, exigindo destreza manual e ambiente adequado para evitar a contaminação do dispositivo pelas bactérias residentes na uretra distal.',
    manga: 'O cateter SpeediCath não possui manga protetora, permitindo o contato direto do cateter com as mãos e com o ambiente durante o procedimento.',
    prontoUso: 'Ambos os cateteres são pronto uso.',
  },
  gentlecath: {
    nome: 'GentleCath Glide',
    fabricante: 'Convatec',
    registro: '80523020075',
    ponta: 'O cateter GentleCath Glide não possui ponta protetora, deixando o dispositivo exposto às bactérias residentes na uretra distal.',
    manga: 'O cateter GentleCath Glide possui manga protetora que não recobre toda a extensão do cateter, tratando-se de invólucro parcial; sua própria instrução de uso orienta não tocar com os dedos a porção desprotegida, o que evidencia o risco de contaminação na manipulação do dispositivo.',
    prontoUso: 'O cateter GentleCath Glide é descrito como pronto uso, porém sua instrução de uso orienta romper o sachê localizado dentro da embalagem para liberar o lubrificante, espalhar a solução ao longo do cateter e aguardar 2 (dois) minutos antes do uso — etapas que descaracterizam o pronto uso declarado. O cateter de referência, por sua vez, é efetivamente pronto para uso: possui fita de vapor ativa que mantém o cateter lubrificado, bastando retirá-lo da embalagem.',
  },
};

function t(text: string): Run {
  return { text };
}
function b(text: string): Run {
  return { text, bold: true };
}
function span(value: string | undefined | null, label: string): Run {
  const v = (value ?? '').trim();
  return v ? { text: v } : { text: `[${label}]`, missing: true };
}

/** Variantes gramaticais por sexo, igual ao `art()` do modelo de referência.
 * `OUTRO`/`NAO_INFORMADO` caem na forma não-marcada (masculina) — fallback
 * deliberado, o modelo original só distinguia Feminino/Masculino. */
function variantesGramaticais(sexo?: Sexo) {
  if (sexo === Sexo.FEMININO) {
    return { o: 'a', paciente: 'a paciente', portador: 'portadora', submetido: 'submetida', orientado: 'orientada e capacitada' };
  }
  return { o: 'o', paciente: 'o paciente', portador: 'portador', submetido: 'submetido', orientado: 'orientado e capacitado' };
}

function calcularIdadeEMenor(dataNascimento?: string): { idade?: number; menor: boolean } {
  if (!dataNascimento) return { menor: false };
  const nasc = dayjs(dataNascimento.slice(0, 10));
  if (!nasc.isValid()) return { menor: false };
  const hoje = dayjs();
  let idade = hoje.year() - nasc.year();
  const aniversarioPassou = hoje.month() > nasc.month() || (hoje.month() === nasc.month() && hoje.date() >= nasc.date());
  if (!aniversarioPassou) idade--;
  return { idade, menor: idade < 18 };
}

function formatarCalibre(french?: number): string | undefined {
  if (french == null) return undefined;
  const mm = (french / 3).toFixed(1).replace('.', ',');
  return `${french} Fr (${mm} mm)`;
}

function itemDoTipo(laudo: LaudoMedico, produtos: Produto[], tipo: string) {
  for (const solicitado of laudo.produtosSolicitados) {
    const produto = produtos.find((p) => p.codigo === solicitado.codigo);
    if (produto && produto.tipo === tipo) return { solicitado, produto };
  }
  return undefined;
}

export function montarLaudoNarrativa(laudo: LaudoMedico, paciente: Paciente, produtos: Produto[]): LaudoNode[] {
  const nodes: LaudoNode[] = [];
  try {
    const art = variantesGramaticais(paciente.sexo);
    const { idade, menor } = calcularIdadeEMenor(paciente.dataNascimento);
    const suj = menor ? 'o menor' : art.paciente;
    const sexoLabel = paciente.sexo ? SEXO_LABEL[paciente.sexo] : undefined;

    const vapro = itemDoTipo(laudo, produtos, 'cateter_vapro');
    const externo = itemDoTipo(laudo, produtos, 'coletor_acticoat');

    // ---- Título + OBJETIVO ----
    nodes.push({ type: 'heading', text: 'RELATÓRIO MÉDICO CIRCUNSTANCIADO' });
    if (laudo.prescricaoIncluirObjetivo) {
      nodes.push({
        type: 'objetivoBox',
        runs: [
          b('OBJETIVO: '),
          t('justificativa técnica para o fornecimento de insumos urológicos específicos, demonstração do nexo causal entre o material inadequado e as complicações de saúde relatadas, e comprovação da indispensabilidade do material prescrito.'),
        ],
      });
    }

    // ---- Identificação ----
    const idRuns: Run[] = [b('Paciente: '), span(paciente.nome, 'NOME COMPLETO')];
    if (paciente.cpf) idRuns.push(t(' — '), b('CPF: '), t(paciente.cpf));
    if (idade !== undefined) idRuns.push(t(' — '), b('Idade: '), t(`${idade} anos`));
    if (sexoLabel) idRuns.push(t(' — '), b('Sexo: '), t(sexoLabel));
    if (paciente.email) idRuns.push(t(' — '), b('E-mail: '), t(paciente.email));
    nodes.push({ type: 'paragraph', runs: idRuns, noIndent: true });

    // ---- §1 — Diagnóstico e cadeia causal ----
    const p1: Run[] = [
      t(`Declaro, para os devidos fins, que ${suj} acima identificad${art.o}, clinicamente examinad${art.o}, é ${art.portador} de `),
      span(laudo.etiologia, 'ETIOLOGIA'),
    ];
    if ((laudo.nivelLesao ?? '').trim()) p1.push(t(`, ${laudo.nivelLesao}`));
    p1.push(t(', evoluindo com '), span(laudo.diagnosticoFuncional, 'DIAGNÓSTICO FUNCIONAL'));
    if (laudo.cid10.length) p1.push(t(` e comorbidades associadas (${laudo.cid10.join(', ')})`));
    p1.push(t('.'));
    if (laudo.riscoEsvaziamento) {
      p1.push(t(
        ' Tal condição impede o esvaziamento espontâneo da bexiga e causa alto volume residual miccional, o que possibilita Infecção do Trato Urinário (ITU)'
        + (laudo.riscoTratoSuperior ? ', lesão no trato urinário superior' : '')
        + (laudo.riscoInsuficienciaRenal ? ' e insuficiência renal' : '')
        + '.',
      ));
    }
    p1.push(t(` Desta forma, ${suj} necessita realizar Cateterismo Vesical Intermitente Limpo (CIL) `), span(laudo.regimeCil, 'REGIME DE CIL'), t(', de forma contínua.'));
    nodes.push({ type: 'paragraph', runs: p1 });

    // ---- §2 — Situação atual e deficiências ----
    const defs: string[] = [];
    if (laudo.deficienciaLubrificacao) defs.push('não possui lubrificação homogênea em toda a sua extensão, provocando traumas e sangramentos uretrais');
    if (laudo.deficienciaPontaProtetora) defs.push('não possui ponta protetora, expondo o cateter às bactérias residentes na uretra distal');
    if (laudo.deficienciaMangaProtetora) defs.push('não possui manga protetora, permitindo o contato direto do dispositivo com as mãos e com o ambiente');
    if (laudo.deficienciaDor) defs.push('provoca dor durante o procedimento, por rigidez do material que dificulta a inserção na uretra para drenagem de urina');
    if (laudo.deficienciaFrascoReutilizado) defs.push('exige o uso repetido do mesmo frasco de lubrificante ao longo do mês, constituindo vetor adicional de contaminação');

    const p2: Run[] = [t('Atualmente o tratamento está sendo executado com '), span(laudo.insumoAtual, 'INSUMO ATUAL')];
    if ((laudo.fornecedorAtual ?? '').trim()) p2.push(t(`, fornecido ${laudo.fornecedorAtual}`));
    p2.push(t('. O dispositivo em uso '));
    if (defs.length) {
      p2.push(t(`${defs.join('; ')}, fatores que aumenta${defs.length > 1 ? 'm' : ''} o risco de infecção urinária`));
    } else {
      p2.push({ text: '[MARCAR DEFICIÊNCIAS NA SEÇÃO IV]', missing: true }, t(', o que aumenta o risco de infecção urinária'));
    }
    p2.push(t(
      (laudo.riscoLesaoUretral ? ', lesão uretral' : '')
      + (laudo.deficienciaRiscoInternacao ? ' e internação hospitalar' : '')
      + ', estando contraindicada a sua utilização para o presente caso.',
    ));
    if (laudo.riscoItuAtual) {
      p2.push(t(
        ` Registro que ${suj} já apresenta infecção urinária de repetição decorrente do procedimento`
        + (laudo.riscoAntibioticoterapia ? ', necessitando de antibioticoterapia para tratamento' : '')
        + '.',
      ));
    }
    if (laudo.deficienciaAlergiaLidocaina) {
      p2.push(t(` Ressalto, ainda, que ${suj} apresenta reação alérgica importante ao uso da lidocaína — material recomendado para a prática do cateterismo —, sendo necessário o emprego de adjuvante alternativo para a realização do procedimento, o que impacta diretamente o tratamento e a qualidade de vida.`));
    }
    nodes.push({ type: 'paragraph', runs: p2 });

    // ---- §3 — Fundamentação técnica (fixo, núcleo probatório) ----
    nodes.push({
      type: 'paragraph',
      runs: [t(`Diante do quadro clínico irreversível e com base no conhecimento técnico dos principais fatores que ocasionam infecção urinária e lesão uretral em paciente ${art.submetido} a cateterismo intermitente — sendo eles: (i) a contaminação do cateter pelas próprias mãos e/ou pelo ambiente no ato do procedimento; (ii) a contaminação por bactérias residentes na uretra distal (primeiros 15 mm); e (iii) a lesão do lúmen uretral por falta de lubrificação —, opto por prescrever um cateter que traga mais segurança ao procedimento, a fim de evitar as infecções urinárias de repetição e o trauma uretral que, ao longo do tempo, podem acarretar deterioração do trato urinário superior e insuficiência renal.`)],
    });

    // ---- §4 — Características do insumo indicado ----
    const p4: Run[] = [t('Assim, indico cateter hidrofílico em PVC (Policloreto de Vinila), pronto para uso (já lubrificado), visando diminuir a manipulação e, consequentemente, a contaminação do procedimento; com ponta protetora, que mantém o cateter estéril durante a inserção, atua como guia introdutório e isola as bactérias localizadas nos primeiros 15 mm da uretra distal; e com manga protetora em toda a extensão do cateter, que serve de barreira mecânica contra possível contaminação das mãos e/ou do ambiente, viabilizando a técnica "no-touch": '
      + `${suj} pode segurar qualquer parte do dispositivo sem contaminá-lo, adaptando o procedimento à sua destreza manual. Desta forma, utilizando um cateter mais seguro, ${suj} consequentemente reduzirá o número de infecções, a lesão uretral e possíveis prejuízos à função renal.`)];
    if (laudo.prescricaoEmbalagemPocket) {
      const contexto = (laudo.contextoSocial ?? '').trim();
      p4.push(t(` Indico também a embalagem pocket, ${contexto ? `devido ${suj} ter ${contexto}, e ` : ''}por proporcionar facilidade no transporte e manuseio, evitando danos à embalagem e o consequente comprometimento do material e do procedimento por contaminação.`));
    }
    nodes.push({ type: 'paragraph', runs: p4 });

    // ---- §4b — Cateter externo ----
    if (laudo.prescricaoCateterExterno) {
      nodes.push({
        type: 'paragraph',
        runs: [t(`Informo também que, ${laudo.riscoPerdasNoturnas ? 'devido às perdas urinárias inesperadas e constantes durante a noite' : 'para o manejo das perdas urinárias'}, recomendo que ${suj} permaneça com cateter externo masculino com membrana interna antirrefluxo de urina, proporcionando coleta urinária durante todo o período, a fim de evitar exposição contínua à umidade característica da condição de incontinência — que propicia ambiente favorável ao crescimento bacteriano, podendo acarretar infecção e lesão de pele por excesso de umidade (dermatite associada à incontinência) — e também para evitar que a perda de urina nas vestes exponha ${suj} a constrangimentos em seu convívio social.`)],
      });
    }

    // ---- §5 — Prescrição formal ----
    nodes.push({ type: 'subheading', text: 'PRESCRIÇÃO' });
    const listaItens: Run[][] = [];

    const comprimento = vapro?.produto.comprimentoCm ? `${vapro.produto.comprimentoCm} cm` : undefined;
    const calibre = formatarCalibre(vapro?.produto.french);
    const unidDia = vapro?.solicitado.quantidade;
    listaItens.push([
      t('Cateter hidrofílico em PVC (Policloreto de Vinila), pronto para uso, com ponta protetora para manter o cateter estéril durante a inserção e com manga protetora sobre toda a extensão do cateter — '),
      span(comprimento, 'COMPRIMENTO'), t(', '), span(calibre, 'CALIBRE'), t(', '), span(unidDia != null ? String(unidDia) : undefined, 'UNID.'),
      t(` unidades/dia${unidDia ? ` (${unidDia * 30} unidades/mês)` : ''}${laudo.prescricaoEmbalagemPocket ? ', embalagem pocket' : ''} — uso contínuo.`),
    ]);

    if (laudo.prescricaoCateterExterno) {
      const tamanho = externo?.produto.nome;
      const codigos = laudo.cateterExterno?.incluirCodigoSiafisico && externo
        ? `, cód. ${externo.produto.codigoFabricante ?? externo.produto.codigo} / SIAFISICO ${externo.solicitado.codigoSiafisico ?? externo.produto.codigoSiafisico ?? '—'}`
        : '';
      if (laudo.cateterExterno?.incluirDescricaoTecnica ?? true) {
        listaItens.push([
          t('Dispositivo (cateter externo) masculino para incontinência urinária, confeccionado em látex, com ponta afunilada adequada para conexão ao tubo de extensão do coletor, reservatório de dois aros sanfonados paralelos para prevenir dobras e torções, composto de 1 (uma) peça, autoadesivo, com membrana interna para prevenção de refluxo de urina e com colar de aplicação — tamanho '),
          span(tamanho, 'SELECIONAR TAMANHO'),
          t(`${codigos} — 1 unidade/dia (30 unidades/mês), uso contínuo.`),
        ]);
      } else {
        listaItens.push([
          t('Cateter externo masculino, confeccionado em látex, autoadesivo e com membrana antirrefluxo, tamanho '),
          span(tamanho, 'SELECIONAR TAMANHO'),
          t(`${codigos} — 1 unidade/dia (30 unidades/mês), uso contínuo.`),
        ]);
      }
    }
    nodes.push({ type: 'list', items: listaItens });

    if (laudo.prescricaoClausulaMarca && vapro) {
      const p5b: Run[] = [t('Reforço que, independentemente de marca ou fabricante, solicito apenas que seja fornecido material que atenda a todos os critérios técnicos de segurança apontados acima, indicando-se o nome comercial a seguir apenas como referência de produto: '), b(vapro.produto.nome)];
      if (comprimento && calibre) p5b.push(t(`, ${comprimento}, ${calibre}`));
      if (laudo.prescricaoIncluirCodigoFabricante) {
        p5b.push(t(` — código do fabricante ${vapro.produto.codigoFabricante ?? vapro.produto.codigo}`));
      }
      p5b.push(t('.'));
      nodes.push({ type: 'paragraph', runs: p5b });
    }

    // ---- §6 — Comparativo ANVISA ----
    if (laudo.comparativoAnvisa) {
      const cmp = COMPARATIVOS_ANVISA[laudo.comparativoAnvisa];
      nodes.push({ type: 'subheading', text: 'ANÁLISE COMPARATIVA — DESCRITIVOS E INSTRUÇÕES DE USO (ANVISA)' });
      nodes.push({
        type: 'paragraph',
        runs: [t(`Está sendo oferecido${art.o === 'a' ? ' à' : ' ao'} paciente${(laudo.fornecedorAtual ?? '').trim() ? `, ${laudo.fornecedorAtual},` : ''} o cateter `), b(`${cmp.nome} (${cmp.fabricante})`), t(`, registro ANVISA ${cmp.registro}, que não possui as mesmas especificações do cateter hidrofílico prescrito. Da avaliação do descritivo e da instrução de uso de ambos os materiais, constantes do sítio eletrônico da ANVISA, apontam-se as seguintes diferenças técnicas:`)],
      });
      nodes.push({ type: 'paragraph', runs: [b('— Ponta protetora: '), t(`${cmp.ponta} O cateter de referência possui ponta protetora, que atua como guia introdutório na uretra e fornece proteção contra as bactérias presentes nos primeiros 15 milímetros da uretra distal, reduzindo o risco de contaminação do cateter e de migração de bactérias para o trato urinário.`)], noIndent: true });
      nodes.push({ type: 'paragraph', runs: [b('— Manga protetora: '), t(`${cmp.manga} O cateter de referência possui manga protetora que recobre toda a extensão do dispositivo, deixando-o totalmente protegido do toque das mãos e da contaminação do ambiente.`)], noIndent: true });
      nodes.push({ type: 'paragraph', runs: [b('— Pronto uso: '), t(cmp.prontoUso)], noIndent: true });
      nodes.push({ type: 'paragraph', runs: [t('Diante das características incompatíveis com a prescrição médica, requer-se que seja reconsiderada a substituição e entregue material de acordo com o prescrito pelo urologista assistente.')] });
    }

    // ---- §7 — Conclusão ----
    if (laudo.prescricaoIncluirConclusao) {
      nodes.push({ type: 'subheading', text: 'CONCLUSÃO' });
      nodes.push({
        type: 'paragraph',
        runs: [t('Diante do exposto, atesta-se que o fornecimento de cateter com as exatas especificações prescritas — hidrofílico, pronto para uso, com ponta protetora e manga protetora em toda a extensão — não se trata de mera preferência de marca, mas de adequação técnica indispensável à segurança do procedimento. A substituição por material que não reúna, cumulativamente, tais características incorre em erro técnico, perpetuando o risco de infecções graves, deterioração da função renal e internações hospitalares recorrentes.')],
      });
    }

    // ---- §8 — Fecho ----
    nodes.push({
      type: 'paragraph',
      runs: [t(`${art.o === 'a' ? 'A' : 'O'} paciente foi ${art.orientado} a realizar o cateterismo intermitente limpo${menor ? ', com o procedimento realizado/assistido pelo responsável legal' : ''}. Assim sendo, é imprescindível que receba, `), b('com urgência e mensalmente'), t(', os materiais adequados para o manejo da disfunção miccional, a fim de garantir o adequado tratamento e a prevenção de novas complicações.')],
    });

    // ---- Assinatura ----
    const dataFormatada = laudo.dataLaudo ? dayjs(laudo.dataLaudo.slice(0, 10)).format('DD/MM/YYYY') : '';
    nodes.push({
      type: 'signature',
      local: [
        ...(laudo.cidadeEmissao ? [t(`${laudo.cidadeEmissao}, `)] : []),
        span(dataFormatada, 'DATA'),
      ],
      nomeMedico: [span(laudo.medicoNomeExibicao, 'NOME DO MÉDICO')],
      especialidadeCrm: [t(`${laudo.medicoEspecialidade || 'Urologia'} — CRM `), span(laudo.crmExibicao, 'CRM/UF')],
    });
  } catch (err) {
    // Um erro em campo isolado nunca derruba a tela nem impede a impressão do
    // restante — mesmo espírito defensivo do gerador de referência.
    nodes.push({
      type: 'paragraph',
      runs: [{ text: `Aviso: não foi possível montar um trecho do relatório (${err instanceof Error ? err.message : String(err)}).`, missing: true }],
    });
  }
  return nodes;
}
