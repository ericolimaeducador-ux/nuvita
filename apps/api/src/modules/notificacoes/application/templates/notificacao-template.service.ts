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
  // Aviso genérico, renderizado por renderAvisoDocumento(): sem título, sem dado clínico.
  [TipoNotificacao.RESULTADO_DISPONIVEL]: {
    assunto: 'Novo documento disponível',
    mensagem: '',
  },
  // TODO(conteudo): texto ESPECÍFICO de incontinência urinária (menciona insumo gratuito via SUS e laudo médico).
  // Mantido como no Nuvita antigo; revisar na etapa de conteúdo (estomaterapia). Não inventar texto clínico novo.
  [TipoNotificacao.ELEGIBILIDADE_CONFIRMADA]: {
    assunto: 'Paciente elegivel para produto gratuito',
    mensagem: 'O paciente {nome} foi confirmado como elegivel para receber o insumo indicado gratuitamente via SUS. Agende o laudo medico.',
  },
};

/**
 * Variante do texto para quando o destinatário é o responsável legal de um
 * paciente menor, não o paciente (ver PacientesService.contatoEfetivo() +
 * CreateNotificacaoDto.paraResponsavel) — {nome} continua sendo quem recebe a
 * mensagem, e {nomePaciente} identifica de quem se trata. Só os 4 tipos
 * operacionais (agenda/teleconsulta/documento) têm variante; ELEGIBILIDADE_CONFIRMADA
 * é notificação interna (sem destinatário humano), sem variante.
 */
const TEMPLATES_RESPONSAVEL: Partial<Record<TipoNotificacao, { assunto: string; mensagem: string }>> = {
  [TipoNotificacao.LEMBRETE_CONSULTA_24H]: {
    assunto: 'Lembrete de consulta',
    mensagem: 'Ola {nome}, a consulta de {nomePaciente} e amanha as {hora} com Dr(a). {medico}',
  },
  [TipoNotificacao.LEMBRETE_CONSULTA_1H]: {
    assunto: 'Consulta em 1 hora',
    mensagem: 'Ola {nome}, a consulta de {nomePaciente} com Dr(a). {medico} sera as {hora}.',
  },
  [TipoNotificacao.CONFIRMACAO_AGENDAMENTO]: {
    assunto: 'Agendamento confirmado',
    mensagem: 'Ola {nome}, o agendamento de {nomePaciente} foi confirmado para {hora} com Dr(a). {medico}.',
  },
  [TipoNotificacao.LINK_TELECONSULTA]: {
    assunto: 'Link da teleconsulta',
    mensagem: 'Ola {nome}, acesse a teleconsulta de {nomePaciente} pelo link: {link}',
  },
  [TipoNotificacao.RESULTADO_DISPONIVEL]: {
    assunto: 'Novo documento disponível',
    mensagem: '',
  },
};

const MAX_PRIMEIRO_NOME = 40;

/** Primeiro nome sem caracteres de controle (evita quebra de linha injetada no corpo). */
function primeiroNome(nome: string | undefined): string {
  // eslint-disable-next-line no-control-regex
  const limpo = (nome ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim();
  return (limpo.split(/\s+/)[0] ?? '').slice(0, MAX_PRIMEIRO_NOME);
}

@Injectable()
export class NotificacaoTemplateService {
  render(tipo: TipoNotificacao, variaveis: Record<string, string>, paraResponsavel = false) {
    const template = (paraResponsavel ? TEMPLATES_RESPONSAVEL[tipo] : undefined) ?? TEMPLATES[tipo];
    if (!template) {
      throw new BadRequestException('Tipo de notificacao sem template configurado.');
    }

    if (tipo === TipoNotificacao.RESULTADO_DISPONIVEL) {
      return { assunto: template.assunto, mensagem: this.renderAvisoDocumento(variaveis, paraResponsavel) };
    }

    return {
      assunto: this.interpolate(template.assunto, variaveis),
      mensagem: this.interpolate(template.mensagem, variaveis),
    };
  }

  /** Só o primeiro nome do destinatário: nem título do documento nem nome do paciente. */
  private renderAvisoDocumento(variaveis: Record<string, string>, paraResponsavel: boolean): string {
    const nome = primeiroNome(variaveis.nome);
    if (paraResponsavel) {
      return nome
        ? `Olá, ${nome}. Há um novo documento disponível no portal.`
        : 'Olá, há um novo documento disponível no portal.';
    }
    return nome
      ? `Olá, ${nome}. Você tem um novo documento disponível no portal. Acesse com seu login para visualizar.`
      : 'Olá, você tem um novo documento disponível no portal. Acesse com seu login para visualizar.';
  }

  private interpolate(template: string, variaveis: Record<string, string>): string {
    return template.replace(/\{([^}]+)\}/g, (_match, key: string) => variaveis[key] ?? '');
  }
}
