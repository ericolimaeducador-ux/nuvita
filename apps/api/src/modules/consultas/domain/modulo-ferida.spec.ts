import {
  AVISOS_FERIDA,
  AVISOS_ITB,
  ERROS_MEDICAO,
  ROTULO_SUSPEITA_BIOFILME,
  TEXTOS_REGIAO_ITB,
  areaPoligono,
  avisosAvaliacaoLesao,
  avisosCategoriaLpp,
  avisosItb,
  calcularMedicaoFoto,
  errosContorno,
  normalizarModuloFerida,
  regiaoItbCompressao,
  temAutointersecao,
  validarAvaliacaoContraLesao,
  validarIdentificacaoLesao,
  validarModuloFerida,
} from '../../../../../../packages/shared/src/consulta';

const LESAO = '65f00000000000000000b001';
const ANEXO = '65f0000000000000000a0001';
const av = (over: Record<string, unknown> = {}) => ({ lesaoId: LESAO, desfecho: { situacao: 'EM_ACOMPANHAMENTO' }, ...over });
const erros = (dados: unknown) => validarModuloFerida(dados).join(' | ');
const cal = (px: number, cm: number) => ({ p1: { x: 0, y: 0 }, p2: { x: px, y: 0 }, distanciaCm: cm });
const P = (x: number, y: number) => ({ x, y });

describe('5c — geometria da medição por foto (casos conhecidos)', () => {
  it('quadrado 2x2 cm: área 4, comprimento = largura = diagonal (2,83)', () => {
    expect(calcularMedicaoFoto(cal(100, 2), [P(0, 0), P(100, 0), P(100, 100), P(0, 100)])).toEqual({ areaCm2: 4, comprimentoCm: 2.83, larguraCm: 2.83 });
  });

  it('retângulo 4x2 cm: área 8; comprimento = diagonal (4,47); largura = extensão perpendicular à diagonal (8/√5 = 3,58)', () => {
    expect(calcularMedicaoFoto(cal(10, 1), [P(0, 0), P(40, 0), P(40, 20), P(0, 20)])).toEqual({ areaCm2: 8, comprimentoCm: 4.47, larguraCm: 3.58 });
  });

  it('triângulo retângulo 4x3 cm: área 6; comprimento = hipotenusa 5; largura = altura relativa à hipotenusa 2,4', () => {
    expect(calcularMedicaoFoto(cal(10, 1), [P(0, 0), P(40, 0), P(0, 30)])).toEqual({ areaCm2: 6, comprimentoCm: 5, larguraCm: 2.4 });
  });

  it('polígono côncavo (L) 3x3 sem o quadrado 2x2 do canto: área 5 (a fórmula não usa o fecho convexo)', () => {
    const L = [P(0, 0), P(30, 0), P(30, 10), P(10, 10), P(10, 30), P(0, 30)];
    expect(calcularMedicaoFoto(cal(10, 1), L).areaCm2).toBe(5);
    expect(temAutointersecao(L)).toBe(false);
  });

  it('sentido do contorno não importa (horário = anti-horário)', () => {
    const horario = [P(0, 0), P(0, 100), P(100, 100), P(100, 0)];
    expect(areaPoligono(horario)).toBe(10000);
  });

  it('ESCALA: dobrar a distância real da régua multiplica as medidas por 2 e a área por 4', () => {
    const q = [P(0, 0), P(50, 0), P(50, 50), P(0, 50)];
    const a = calcularMedicaoFoto(cal(50, 1), q);
    const b = calcularMedicaoFoto(cal(50, 2), q);
    expect(b.areaCm2).toBeCloseTo(a.areaCm2 * 4, 2);
    expect(b.comprimentoCm).toBeCloseTo(a.comprimentoCm * 2, 1);
    // A régua inclinada dá a mesma escala: 3-4-5.
    expect(calcularMedicaoFoto({ p1: P(0, 0), p2: P(30, 40), distanciaCm: 5 }, q).areaCm2).toBe(25);
  });

  it('recusa: calibração com distância <= 0 ou pontos coincidentes; contorno < 3 pontos, repetido, cruzado ou alinhado', () => {
    const q = [P(0, 0), P(10, 0), P(10, 10)];
    expect(() => calcularMedicaoFoto(cal(10, 0), q)).toThrow(ERROS_MEDICAO.calibracaoDistancia);
    expect(() => calcularMedicaoFoto(cal(10, -1), q)).toThrow(ERROS_MEDICAO.calibracaoDistancia);
    expect(() => calcularMedicaoFoto({ p1: P(5, 5), p2: P(5, 5), distanciaCm: 1 }, q)).toThrow(ERROS_MEDICAO.calibracaoCoincidente);
    expect(errosContorno([P(0, 0), P(1, 1)])).toEqual([ERROS_MEDICAO.contornoPoucosPontos]);
    expect(errosContorno([P(0, 0), P(10, 0), P(0, 0), P(0, 10)])).toEqual([ERROS_MEDICAO.contornoPontoRepetido]);
    expect(errosContorno([P(0, 0), P(10, 10), P(10, 0), P(0, 10)])).toEqual([ERROS_MEDICAO.contornoAutointersecao]); // gravata-borboleta
    expect(errosContorno([P(0, 0), P(10, 0), P(20, 0)])).not.toEqual([]); // alinhados (dobra sobre si / sem área)
    expect(errosContorno([P(0, 0), P(-1, 5), P(5, 5)])).toEqual([ERROS_MEDICAO.pontoInvalido]);
  });
});

describe('5c — validação estrutural do módulo FERIDA', () => {
  it('payload completo e válido', () => {
    const dados = {
      avaliacoes: [
        av({
          tecido: { percentuais: { GRANULACAO: 60, ESFACELO: 30, NECROSE_SECA: 10 }, estruturasExpostas: ['TENDAO'] },
          exsudato: { quantidade: 'MODERADO', aspecto: 'SEROSO', odor: 'AUSENTE' },
          borda: { caracteristicas: ['IRREGULAR', 'MACERADA'], tuneis: [{ profundidadeCm: 1.5, posicaoHora: 12 }] },
          pelePerilesional: ['ERITEMA', 'EDEMA'],
          infeccao: { sinaisEncobertos: ['CICATRIZACAO_LENTA'], sinaisManifestos: ['RUBOR'], respostaSistemica: false, suspeitaBiofilme: true, impressaoClinica: 'x' },
          medidas: { manual: { comprimentoCm: 3, larguraCm: 2, profundidadeCm: 0.5 } },
          materiais: [{ produtoCodigo: 101 }, { descricao: 'gaze' }],
        }),
      ],
      itb: [{ membro: 'DIREITO', valor: 0.95, finalidade: 'SEGURANCA_COMPRESSAO', metodoEquipamento: 'doppler' }],
    };
    expect(validarModuloFerida(dados)).toEqual([]);
    expect(validarModuloFerida({})).toEqual([]);
  });

  it.each([
    ['soma do tecido != 100', { tecido: { percentuais: { GRANULACAO: 60, ESFACELO: 30 } } }, 'a soma dos percentuais deve ser 100'],
    ['percentual não inteiro', { tecido: { percentuais: { GRANULACAO: 99.5, ESFACELO: 0.5 } } }, 'tecido.percentuais.GRANULACAO'],
    ['tecido desconhecido', { tecido: { percentuais: { FIBRINA: 100 } } }, 'tecido.percentuais.FIBRINA'],
    ['exsudato sem quantidade', { exsudato: { aspecto: 'SEROSO' } }, 'exsudato.quantidade: obrigatorio'],
    ['exsudato presente sem aspecto', { exsudato: { quantidade: 'POUCO' } }, 'exsudato.aspecto: obrigatorio'],
    ['aspecto com exsudato ausente', { exsudato: { quantidade: 'AUSENTE', aspecto: 'SEROSO' } }, 'exsudato.aspecto'],
    ['INTEGRA com outro achado', { pelePerilesional: ['INTEGRA', 'ERITEMA'] }, 'INTEGRA exclui'],
    ['túnel na hora 13', { borda: { tuneis: [{ profundidadeCm: 1, posicaoHora: 13 }] } }, 'posicaoHora'],
    ['túnel sem profundidade', { borda: { tuneis: [{ posicaoHora: 3 }] } }, 'profundidadeCm: obrigatorio'],
    ['material vazio', { materiais: [{}] }, 'materiais[0]: informe o produto'],
    ['sem desfecho', { desfecho: undefined }, 'desfecho: obrigatorio'],
    ['ENCERRADA sem motivo', { desfecho: { situacao: 'ENCERRADA' } }, 'desfecho.motivo: obrigatorio'],
    ['motivo fora do encerramento', { desfecho: { situacao: 'CICATRIZADA', motivo: 'x' } }, 'desfecho.motivo'],
    ['escala com itens (PUSH) não existe', { push: 12 }, 'avaliacoes[0].push: campo nao permitido'],
    ['escore de infecção não existe', { infeccao: { nivel: 'ALTO' } }, 'infeccao.nivel: campo nao permitido'],
    ['LPP com categoria inválida', { lpp: { categoria: 'V' } }, 'lpp.categoria'],
  ])('%s -> erro', (_n, over, trecho) => {
    expect(erros({ avaliacoes: [av(over)] })).toContain(trecho);
  });

  it('lesão repetida no mesmo módulo -> erro; erros nunca trazem o valor digitado', () => {
    expect(erros({ avaliacoes: [av(), av()] })).toContain('lesao repetida');
    expect(erros({ avaliacoes: [av({ exsudato: { quantidade: 'VALOR-SIGILOSO' } })] })).not.toMatch(/SIGILOSO/);
  });

  it('medida por foto: resultado do cliente é descartado e recalculado na normalização', () => {
    const foto = { anexoId: ANEXO, calibracao: cal(10, 1), contorno: [P(0, 0), P(40, 0), P(0, 30)], resultado: { areaCm2: 1, comprimentoCm: 1, larguraCm: 1 } };
    const dados = { avaliacoes: [av({ medidas: { fotos: [foto] } })] };
    expect(validarModuloFerida(dados)).toEqual([]);
    expect(normalizarModuloFerida(dados as never).avaliacoes![0].medidas!.fotos![0].resultado).toEqual({ areaCm2: 6, comprimentoCm: 5, larguraCm: 2.4 });
    expect(erros({ avaliacoes: [av({ medidas: { fotos: [{ ...foto, calibracao: cal(10, 0) }] } })] })).toContain(ERROS_MEDICAO.calibracaoDistancia);
    expect(erros({ avaliacoes: [av({ medidas: { fotos: [{ ...foto, contorno: [P(0, 0), P(1, 1)] }] } })] })).toContain(ERROS_MEDICAO.contornoPoucosPontos);
  });
});

describe('5c — regras que dependem da etiologia da lesão', () => {
  it('LPP sem categoria -> erro; adesivo sem observações -> erro; blocos fora da etiologia -> erro', () => {
    expect(validarAvaliacaoContraLesao(av() as never, 'LESAO_POR_PRESSAO', 'a').join()).toContain('a.lpp.categoria: obrigatorio');
    expect(validarAvaliacaoContraLesao(av({ lpp: { categoria: 'II' } }) as never, 'LESAO_POR_PRESSAO', 'a')).toEqual([]);
    expect(validarAvaliacaoContraLesao(av() as never, 'LESAO_ADESIVO_MEDICO', 'a').join()).toMatch(/observacaoRemocao.*observacao30min/);
    expect(validarAvaliacaoContraLesao(av({ lpp: { categoria: 'I' } }) as never, 'ULCERA_VENOSA', 'a').join()).toContain('so se aplica a lesao por pressao');
    expect(validarAvaliacaoContraLesao(av({ lesaoAdesivo: {} }) as never, 'ULCERA_VENOSA', 'a').join()).toContain('so se aplica a lesao por adesivo');
  });

  it('adesivo: segunda observação exatamente 30 min depois é aceita; 29 min -> texto especificado', () => {
    const obs = (iso2: string) => ({ lesaoAdesivo: { observacaoRemocao: { em: '2026-11-06T10:00:00.000Z' }, observacao30min: { em: iso2 } } });
    expect(erros({ avaliacoes: [av(obs('2026-11-06T10:30:00.000Z'))] })).toBe('');
    expect(erros({ avaliacoes: [av(obs('2026-11-06T10:29:59.000Z'))] })).toContain(AVISOS_FERIDA.adesivo30min);
    expect(erros({ avaliacoes: [av(obs('2026-11-06 10:40'))] })).toContain('data-hora invalida');
  });

  it('identificação: OUTRA sem texto, umidade sem subtipo -> erro', () => {
    const base = { localizacaoAnatomica: 'sacral', lado: 'CENTRAL' };
    expect(validarIdentificacaoLesao({ ...base, etiologia: 'OUTRA' }).join()).toContain('etiologiaOutra: obrigatorio');
    expect(validarIdentificacaoLesao({ ...base, etiologia: 'OUTRA', etiologiaOutra: ' ' }).join()).toContain('etiologiaOutra: obrigatorio');
    expect(validarIdentificacaoLesao({ ...base, etiologia: 'LESAO_UMIDADE' }).join()).toContain('subtipoUmidade: obrigatorio');
    expect(validarIdentificacaoLesao({ ...base, etiologia: 'LESAO_UMIDADE', subtipoUmidade: 'INTERTRIGINOSA' })).toEqual([]);
    expect(validarIdentificacaoLesao({ ...base, etiologia: 'PE_DIABETICO', lado: 'ACIMA' }).join()).toContain('lado');
  });
});

describe('5c — avisos fixos (sem conduta)', () => {
  it('dicas da categoria de LPP; resposta sistêmica; biofilme só como suspeita', () => {
    expect(avisosCategoriaLpp('NAO_CLASSIFICAVEL')).toEqual([AVISOS_FERIDA.lppNaoClassificavel]);
    expect(avisosCategoriaLpp('MUCOSA')).toEqual(['Lesão em mucosa não se classifica pelo sistema cutâneo.']);
    expect(avisosCategoriaLpp('I')).toEqual([AVISOS_FERIDA.lppPeleEscura]);
    expect(avisosCategoriaLpp('SUSPEITA_LESAO_TISSULAR_PROFUNDA')).toEqual([AVISOS_FERIDA.lppPeleEscura]);
    expect(avisosCategoriaLpp('III')).toEqual([]);
    expect(avisosAvaliacaoLesao(av({ infeccao: { respostaSistemica: true } }) as never)).toEqual(['Resposta sistêmica registrada — encaminhamento e tratamento imediatos.']);
    expect(ROTULO_SUSPEITA_BIOFILME).toBe('Suspeita de biofilme');
  });
});

describe('5c — ITB: finalidade obrigatória e FRONTEIRAS explícitas', () => {
  it('sem finalidade, valor fora de 0,10–3,00, mais de 2 casas ou membro repetido -> erro', () => {
    expect(erros({ itb: [{ membro: 'DIREITO', valor: 1 }] })).toContain('itb[0].finalidade: obrigatorio');
    for (const valor of [0.09, 3.01, 1.234, -1]) expect(erros({ itb: [{ membro: 'DIREITO', valor, finalidade: 'DIAGNOSTICO_DAP' }] })).toContain('itb[0].valor');
    for (const valor of [0.1, 3, 1.4, 0.83]) expect(erros({ itb: [{ membro: 'DIREITO', valor, finalidade: 'DIAGNOSTICO_DAP' }] })).toBe('');
    const dois = { itb: [{ membro: 'ESQUERDO', valor: 1, finalidade: 'DIAGNOSTICO_DAP' }, { membro: 'ESQUERDO', valor: 1, finalidade: 'DIAGNOSTICO_DAP' }] };
    expect(erros(dois)).toContain('membro repetido');
  });

  it.each([
    [0.1, 'FORA_ESCOPO'], [0.59, 'FORA_ESCOPO'],
    [0.6, 'CONFLITO'], [0.79, 'CONFLITO'],
    [0.8, 'TODAS_ADMITEM'], [1.0, 'TODAS_ADMITEM'], [1.2, 'TODAS_ADMITEM'],
    [1.21, 'CONFLITO'], [1.3, 'CONFLITO'],
    [1.31, 'FORA_FAIXA'], [1.4, 'FORA_FAIXA'],
    [1.41, null], [3.0, null],
  ])('compressão: %s -> %s', (valor, regiao) => {
    expect(regiaoItbCompressao(valor)).toBe(regiao);
  });

  it('ponto flutuante: 0,1+0,7 (= 0,7999…) cai na mesma região que 0,80', () => {
    expect(regiaoItbCompressao(0.1 + 0.7)).toBe('TODAS_ADMITEM');
  });

  it('avisos: > 1,40 não confiável; compressão mostra a região; diagnóstico só a referência; nunca texto de conduta', () => {
    expect(avisosItb({ valor: 1.41, finalidade: 'SEGURANCA_COMPRESSAO' })).toEqual([AVISOS_ITB.naoConfiavel]);
    expect(avisosItb({ valor: 1.4, finalidade: 'SEGURANCA_COMPRESSAO' })).toEqual([TEXTOS_REGIAO_ITB.FORA_FAIXA]);
    expect(avisosItb({ valor: 0.9, finalidade: 'SEGURANCA_COMPRESSAO' })).toEqual(['faixa em que todas as fontes compiladas admitem compressão']);
    expect(avisosItb({ valor: 0.5, finalidade: 'DIAGNOSTICO_DAP' })).toEqual(['faixa de diagnóstico 0,90–1,40']);
    expect(avisosItb({ valor: 1.5, finalidade: 'DIAGNOSTICO_DAP' })).toEqual([AVISOS_ITB.naoConfiavel, AVISOS_ITB.referenciaDiagnostico]);
    const todos = [...Object.values(TEXTOS_REGIAO_ITB), ...Object.values(AVISOS_ITB)].join(' ').toLowerCase();
    expect(todos).not.toMatch(/pode comprimir|não comprimir|nao comprimir/);
  });
});
