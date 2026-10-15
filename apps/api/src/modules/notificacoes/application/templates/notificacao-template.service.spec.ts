import { TipoNotificacao } from '../../domain/notificacao.entity';
import { NotificacaoTemplateService } from './notificacao-template.service';

describe('NotificacaoTemplateService', () => {
  const service = new NotificacaoTemplateService();

  it('render() sem paraResponsavel (padrão) dirige a mensagem ao próprio paciente', () => {
    const { mensagem } = service.render(TipoNotificacao.CONFIRMACAO_AGENDAMENTO, {
      nome: 'Maria',
      nomePaciente: 'Maria',
      hora: '10h',
      medico: 'Dr. João',
    });

    expect(mensagem).toContain('Ola Maria,');
    expect(mensagem).not.toContain('de Maria'); // sem o "sobre {nomePaciente}" quando o destinatário é o próprio
  });

  it('render() com paraResponsavel=true dirige a mensagem ao responsável e identifica o paciente', () => {
    const { mensagem } = service.render(
      TipoNotificacao.CONFIRMACAO_AGENDAMENTO,
      { nome: 'Mãe da Criança', nomePaciente: 'Joaquinzinho', hora: '10h', medico: 'Dr. João' },
      true,
    );

    expect(mensagem).toContain('Ola Mãe da Criança,');
    expect(mensagem).toContain('agendamento de Joaquinzinho');
  });

  it.each([
    TipoNotificacao.LEMBRETE_CONSULTA_24H,
    TipoNotificacao.LEMBRETE_CONSULTA_1H,
    TipoNotificacao.CONFIRMACAO_AGENDAMENTO,
    TipoNotificacao.LINK_TELECONSULTA,
  ])('%s tem variante para responsável, e ela cita {nomePaciente}', (tipo) => {
    const variaveis = { nome: 'Responsável', nomePaciente: 'Paciente X', hora: '10h', medico: 'Dr. A', link: 'http://x', documento: 'Laudo' };

    const paraPaciente = service.render(tipo, variaveis, false);
    const paraResponsavel = service.render(tipo, variaveis, true);

    expect(paraResponsavel.mensagem).toContain('Paciente X');
    expect(paraResponsavel.mensagem).not.toEqual(paraPaciente.mensagem);
  });

  it('ELEGIBILIDADE_CONFIRMADA não tem variante para responsável — paraResponsavel=true cai no template padrão sem quebrar', () => {
    const { mensagem } = service.render(
      TipoNotificacao.ELEGIBILIDADE_CONFIRMADA,
      { nome: 'Paciente X', hora: '', medico: '', link: '', documento: '' },
      true,
    );

    expect(mensagem).toContain('Paciente X');
  });
});

describe('NotificacaoTemplateService — RESULTADO_DISPONIVEL (aviso genérico, sem dado clínico)', () => {
  const service = new NotificacaoTemplateService();
  const SENTINELA = 'LAUDO-PSICOLOGICO-XYZ';

  it('assunto exato, com acento e sem a palavra "Resultado"', () => {
    const { assunto } = service.render(TipoNotificacao.RESULTADO_DISPONIVEL, { nome: 'Maria Souza' });

    expect(assunto).toBe('Novo documento disponível');
  });

  it('corpo genérico com acentos e saudação só com o primeiro nome', () => {
    const { mensagem } = service.render(TipoNotificacao.RESULTADO_DISPONIVEL, { nome: 'Maria Souza Lima' });

    expect(mensagem).toBe(
      'Olá, Maria. Você tem um novo documento disponível no portal. Acesse com seu login para visualizar.',
    );
    expect(mensagem).not.toContain('Souza');
  });

  it('sem nome, a saudação é só "Olá,"', () => {
    const { mensagem } = service.render(TipoNotificacao.RESULTADO_DISPONIVEL, { nome: '' });

    expect(mensagem).toBe('Olá, você tem um novo documento disponível no portal. Acesse com seu login para visualizar.');
  });

  it.each([false, true])('o título do documento não aparece no assunto nem no corpo (paraResponsavel=%s)', (paraResponsavel) => {
    const rendered = service.render(
      TipoNotificacao.RESULTADO_DISPONIVEL,
      { nome: 'Maria Souza', nomePaciente: 'Joaquim', documento: SENTINELA },
      paraResponsavel,
    );

    expect(JSON.stringify(rendered)).not.toContain(SENTINELA);
    expect(rendered.mensagem).not.toMatch(/laudo|psicol[oó]g|prontu[aá]rio|resultado/i);
  });

  it('variante do responsável: só primeiro nome do destinatário, sem paciente nem título', () => {
    const { assunto, mensagem } = service.render(
      TipoNotificacao.RESULTADO_DISPONIVEL,
      { nome: 'Ana Paula Mendes', nomePaciente: 'Joaquim Silva', documento: SENTINELA },
      true,
    );

    expect(assunto).toBe('Novo documento disponível');
    expect(mensagem).toBe('Olá, Ana. Há um novo documento disponível no portal.');
    expect(mensagem).not.toContain('Joaquim');
    expect(mensagem).not.toContain('Mendes');
    expect(JSON.stringify({ assunto, mensagem })).not.toContain(SENTINELA);
  });

  it('nome com quebra de linha/controle não vira linha nova no corpo', () => {
    const { mensagem } = service.render(TipoNotificacao.RESULTADO_DISPONIVEL, { nome: '\r\nBcc:x@y.com' });

    expect(mensagem).not.toMatch(/[\r\n]/);
  });
});
