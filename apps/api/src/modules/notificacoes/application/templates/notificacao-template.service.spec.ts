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
