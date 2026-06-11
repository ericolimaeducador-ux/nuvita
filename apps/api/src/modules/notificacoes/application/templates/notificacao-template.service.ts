import { BadRequestException, Injectable } from '@nestjs/common';
import { TipoNotificacao } from '../../domain/notificacao.entity';

const TEMPLATES: Record<TipoNotificacao, { assunto: string; mensagem: string }> = {
  [TipoNotificacao.LEMBRETE_CONSULTA_24H]: {
    assunto: 'Lembrete de consulta',
    mensagem: 'Ola {nome}, sua consulta e amanha as {hora} com Dr(a). {medico}',
  },
  [TipoNotificacao.LEMBRETE_CONSULTA_1H]: {
    assunto: 'Consulta em 1 hora',
    mensagem: 'Ola {nome}, sua consulta com Dr(a). {medico} sera as {hora}.',
  },
  [TipoNotificacao.CONFIRMACAO_AGENDAMENTO]: {
    assunto: 'Agendamento confirmado',
    mensagem: 'Ola {nome}, seu agendamento foi confirmado para {hora} com Dr(a). {medico}.',
  },
  [TipoNotificacao.LINK_TELECONSULTA]: {
    assunto: 'Link da teleconsulta',
    mensagem: 'Ola {nome}, acesse sua teleconsulta pelo link: {link}',
  },
  [TipoNotificacao.RESULTADO_DISPONIVEL]: {
    assunto: 'Resultado disponivel',
    mensagem: 'Ola {nome}, o documento {documento} ja esta disponivel no seu prontuario.',
  },
};

@Injectable()
export class NotificacaoTemplateService {
  render(tipo: TipoNotificacao, variaveis: Record<string, string>) {
    const template = TEMPLATES[tipo];
    if (!template) {
      throw new BadRequestException('Tipo de notificacao sem template configurado.');
    }

    return {
      assunto: this.interpolate(template.assunto, variaveis),
      mensagem: this.interpolate(template.mensagem, variaveis),
    };
  }

  private interpolate(template: string, variaveis: Record<string, string>): string {
    return template.replace(/\{([^}]+)\}/g, (_match, key: string) => variaveis[key] ?? '');
  }
}
