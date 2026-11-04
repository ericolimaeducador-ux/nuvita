import { ConfigService } from '@nestjs/config';
import { EmailSender } from '../../notificacoes/infrastructure/senders/email.sender';
import { InscricaoTeste } from '../domain/inscricao-teste.entity';
import { InscricoesTesteMailer } from './inscricoes-teste.mailer';

const inscricao = {
  nome: 'Maria Souza',
  email: 'maria@example.com',
  whatsapp: '(11) 90000-0000',
  crpNumero: '06/00000',
  cidadeEstado: 'São Paulo, SP',
  modoAtendimento: 'Online',
  termoVersao: 'teste-beta-v1-2026-10',
  aceiteTermoEm: new Date('2026-10-14T18:00:00Z'),
} as unknown as InscricaoTeste;

function criar(env: Record<string, string> = {}) {
  const send = jest.fn().mockResolvedValue(undefined);
  const config = { get: (k: string) => env[k] } as unknown as ConfigService;
  return { mailer: new InscricoesTesteMailer({ send } as unknown as EmailSender, config), send };
}

describe('InscricoesTesteMailer — Reply-To', () => {
  it('confirmação responde para contato@nuvita.app.br por padrão', async () => {
    const { mailer, send } = criar();
    await mailer.confirmarRecebimento(inscricao);
    expect(send.mock.calls[0][0].conteudo).toMatchObject({
      destino: 'maria@example.com',
      responderPara: 'contato@nuvita.app.br',
    });
  });

  it('confirmação usa INSCRICOES_TESTE_EMAIL_RESPOSTA quando definido', async () => {
    const { mailer, send } = criar({ INSCRICOES_TESTE_EMAIL_RESPOSTA: 'outro@nuvita.app.br' });
    await mailer.confirmarRecebimento(inscricao);
    expect(send.mock.calls[0][0].conteudo.responderPara).toBe('outro@nuvita.app.br');
  });

  it('aviso à equipe responde direto para a candidata', async () => {
    const { mailer, send } = criar({ INSCRICOES_TESTE_EMAIL_AVISO: 'contato@nuvita.app.br' });
    await mailer.avisarEquipe(inscricao);
    expect(send.mock.calls[0][0].conteudo).toMatchObject({
      destino: 'contato@nuvita.app.br',
      responderPara: 'maria@example.com',
    });
  });
});
