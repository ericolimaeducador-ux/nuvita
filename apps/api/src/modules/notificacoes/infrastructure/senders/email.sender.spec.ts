import { EmailSender } from './email.sender';
import { CanalNotificacao, TipoNotificacao } from '../../domain/notificacao.entity';
import { NotificacaoTemplateService } from '../../application/templates/notificacao-template.service';

const SENTINELA = 'LAUDO-PSICOLOGICO-XYZ';

function makeSender(config: Record<string, unknown> = {}) {
  const configService = {
    getConfig: () => ({
      emailProvider: 'resend',
      emailFrom: 'no-reply@psi.nuvita.app.br',
      resendApiKey: 're_test_key',
      sendgridApiKey: 'SG.test',
      ...config,
    }),
  };
  return new EmailSender(configService as never);
}

function conteudoDoAviso(nome = 'Maria Souza') {
  const rendered = new NotificacaoTemplateService().render(TipoNotificacao.RESULTADO_DISPONIVEL, {
    nome,
    nomePaciente: nome,
    documento: SENTINELA,
  });
  return { ...rendered, destino: 'paciente@teste.com', variaveis: { nome, documento: SENTINELA } };
}

describe('EmailSender — aviso de documento (Resend)', () => {
  let fetchMock: jest.Mock;
  const original = global.fetch;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({ ok: true, text: async () => '' });
    global.fetch = fetchMock as never;
  });
  afterEach(() => {
    global.fetch = original;
  });

  async function enviar(sender: EmailSender, conteudo = conteudoDoAviso()) {
    await sender.send({ canal: CanalNotificacao.EMAIL, conteudo });
    const [url, init] = fetchMock.mock.calls[0];
    return { url: url as string, raw: init.body as string, body: JSON.parse(init.body as string) };
  }

  it('payload enviado ao provedor não contém o título do documento em lugar nenhum', async () => {
    const { raw } = await enviar(makeSender());

    expect(raw).not.toContain(SENTINELA);
  });

  it('assunto exato "Novo documento disponível"', async () => {
    const { body } = await enviar(makeSender());

    expect(body.subject).toBe('Novo documento disponível');
  });

  it('Reply-To = contato@nuvita.app.br', async () => {
    const { body } = await enviar(makeSender());

    expect(body.reply_to).toBe('contato@nuvita.app.br');
  });

  it('remetente sem no-reply/noreply e no domínio verificado psi.nuvita.app.br, mesmo com EMAIL_FROM antigo de no-reply', async () => {
    const { body } = await enviar(makeSender({ emailFrom: 'no-reply@psi.nuvita.app.br' }));

    expect(body.from).not.toMatch(/no-?reply/i);
    expect(body.from).toBe('Nuvita Psi <avisos@psi.nuvita.app.br>');
  });

  it('remetente configurado em outro domínio não é usado (só o domínio verificado no Resend)', async () => {
    const { body } = await enviar(makeSender({ emailFrom: 'avisos@outro-dominio.com' }));

    expect(body.from).toMatch(/@psi\.nuvita\.app\.br>?$/);
  });

  it('remetente configurado válido do domínio verificado é respeitado', async () => {
    const { body } = await enviar(makeSender({ emailFrom: 'Nuvita Psi <contato@psi.nuvita.app.br>' }));

    expect(body.from).toBe('Nuvita Psi <contato@psi.nuvita.app.br>');
  });

  it('texto plano presente e idêntico à mensagem renderizada', async () => {
    const conteudo = conteudoDoAviso();
    const { body } = await enviar(makeSender(), conteudo);

    expect(body.text).toBe(conteudo.mensagem);
    expect(body.text).toContain('Olá, Maria.');
  });

  it('assunto com CR/LF (dado de usuário) não vira header cru: quebras são removidas', async () => {
    const conteudo = { ...conteudoDoAviso(), assunto: 'Oi\r\nBcc: invasor@x.com' };
    const { body } = await enviar(makeSender(), conteudo);

    expect(body.subject).not.toMatch(/[\r\n]/);
  });

  it('sem link no corpo (nenhuma URL nova)', async () => {
    const { body } = await enviar(makeSender());

    expect(body.text).not.toMatch(/https?:\/\//i);
  });
});

describe('EmailSender — aviso de documento (SendGrid)', () => {
  let fetchMock: jest.Mock;
  const original = global.fetch;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({ ok: true, text: async () => '' });
    global.fetch = fetchMock as never;
  });
  afterEach(() => {
    global.fetch = original;
  });

  it('inclui reply_to, remetente no domínio verificado sem no-reply e texto plano', async () => {
    const sender = makeSender({ emailProvider: 'sendgrid' });
    await sender.send({ canal: CanalNotificacao.EMAIL, conteudo: conteudoDoAviso() });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);

    expect(body.reply_to).toEqual({ email: 'contato@nuvita.app.br' });
    expect(body.from.email).toBe('avisos@psi.nuvita.app.br');
    expect(body.from.name).toBe('Nuvita Psi');
    expect(body.subject).toBe('Novo documento disponível');
    expect(JSON.stringify(body)).not.toContain(SENTINELA);
    expect(body.content[0]).toMatchObject({ type: 'text/plain' });
  });
});
