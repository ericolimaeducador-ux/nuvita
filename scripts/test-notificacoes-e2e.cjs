/**
 * Teste fim a fim das notificações usando o CÓDIGO REAL da aplicação (dist compilado).
 * Exercita: AppConfigService (lê apps/api/.env) -> NotificacaoTemplateService ->
 * NotificacaoDispatcherService -> WhatsAppSender/EmailSender -> provedores reais (Z-API / Resend).
 *
 * Pula apenas as camadas genéricas (HTTP/auth/Mongo/fila/janela), que não dependem das credenciais.
 *
 * Uso: node scripts/test-notificacoes-e2e.cjs <telefoneWhatsApp> <emailDestino>
 */
const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'apps', 'api');
const DIST = path.join(API_DIR, 'dist', 'apps', 'api', 'src');

// 1) Carrega apps/api/.env em process.env (split no primeiro '=' para preservar base64/URIs)
const envFile = path.join(API_DIR, '.env');
for (const raw of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
  const line = raw.trim();
  if (!line || line.startsWith('#')) continue;
  const i = line.indexOf('=');
  if (i === -1) continue;
  const key = line.slice(0, i).trim();
  if (!(key in process.env)) process.env[key] = line.slice(i + 1).trim();
}
process.env.NODE_ENV = 'development';

// 2) Importa as classes compiladas da própria aplicação
const { AppConfigService } = require(path.join(DIST, 'common/security/config.service.js'));
// Em dev o AppConfigService nunca chama o GCP; usamos um stub para não abrir clients gRPC
// (que causam crash de teardown no Windows ao sair do processo).
const googleSecretsStub = { getSecret: async () => undefined };
const { NotificacaoTemplateService } = require(path.join(DIST, 'modules/notificacoes/application/templates/notificacao-template.service.js'));
const { NotificacaoDispatcherService } = require(path.join(DIST, 'modules/notificacoes/application/notificacao-dispatcher.service.js'));
const { WhatsAppSender } = require(path.join(DIST, 'modules/notificacoes/infrastructure/senders/whatsapp.sender.js'));
const { EmailSender } = require(path.join(DIST, 'modules/notificacoes/infrastructure/senders/email.sender.js'));
const { CanalNotificacao, TipoNotificacao } = require(path.join(DIST, 'modules/notificacoes/domain/notificacao.entity.js'));

const telefone = process.argv[2] || '5511977612546';
const email = process.argv[3] || 'ericolima.educador@gmail.com';

async function main() {
  // 3) Bootstrap da config real (lê .env, sem GCP em dev)
  const configService = new AppConfigService(googleSecretsStub);
  await configService.initialize();
  const cfg = configService.getConfig();
  console.log('Config carregada:');
  console.log('  whatsappProvider =', cfg.whatsappProvider);
  console.log('  emailProvider    =', cfg.emailProvider, '| from =', cfg.emailFrom);

  // 4) Monta o dispatcher real com os senders reais
  const templates = new NotificacaoTemplateService();
  const dispatcher = new NotificacaoDispatcherService([
    new WhatsAppSender(configService),
    new EmailSender(configService),
  ]);

  const variaveis = { nome: 'Erico (teste E2E)', hora: '14:00', medico: 'Dra. Andreia', link: '', documento: '' };

  // 5) WhatsApp via template real CONFIRMACAO_AGENDAMENTO
  const waRender = templates.render(TipoNotificacao.CONFIRMACAO_AGENDAMENTO, variaveis);
  console.log('\n[WhatsApp] mensagem renderizada:', waRender.mensagem);
  await dispatcher.dispatch({
    canal: CanalNotificacao.WHATSAPP,
    conteudo: { ...waRender, destino: telefone, variaveis },
  });
  console.log('[WhatsApp] ✓ enviado para', telefone);

  // 6) Email via template real LEMBRETE_CONSULTA_24H
  const mailRender = templates.render(TipoNotificacao.LEMBRETE_CONSULTA_24H, variaveis);
  console.log('\n[Email] assunto:', mailRender.assunto, '| mensagem:', mailRender.mensagem);
  await dispatcher.dispatch({
    canal: CanalNotificacao.EMAIL,
    conteudo: { ...mailRender, destino: email, variaveis },
  });
  console.log('[Email] ✓ enviado para', email);

  console.log('\n✅ Pipeline interno completo: config -> template -> dispatcher -> sender -> provedor real.');
}

// Sem process.exit(): deixamos o Node encerrar naturalmente quando os sockets do
// fetch (undici, keep-alive) fecharem — evita crash de teardown no Windows.
main()
  .then(() => { process.exitCode = 0; })
  .catch((err) => {
    console.error('\n❌ FALHOU:', err.message);
    process.exitCode = 1;
  });
