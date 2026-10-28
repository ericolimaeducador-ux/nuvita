import { ValidationPipe } from '@nestjs/common';
import Redis from 'ioredis';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { InvalidObjectIdFilter } from './common/http/invalid-object-id.filter';
import { AppConfigService } from './common/security/config.service';
import { REDIS_CLIENT } from './modules/auth/auth.constants';
import { aguardarRedisPronto } from './modules/auth/infrastructure/redis/redis-boot';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(AppConfigService);
  const config = configService.getConfig();

  const isProd = config.nodeEnv === 'production';

  // CSP fica ligado fora de dev. Em dev é desligado para a UI do Swagger funcionar.
  app.use(helmet({ contentSecurityPolicy: config.nodeEnv !== 'development' }));
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new InvalidObjectIdFilter(app.get(HttpAdapterHost).httpAdapter));

  // O Cloud Run manda SIGTERM e espera ~10s antes do SIGKILL. Sem os hooks, o
  // Nest não propaga o sinal: requisição em voo é cortada no meio e as
  // conexões Mongo/Redis não fecham limpas — erro no cliente a cada deploy ou
  // scale-down, e conexão órfã acumulando no Atlas.
  app.enableShutdownHooks();

  app.enableCors({
    origin: config.corsOrigin,
    credentials: true,
  });

  // Swagger nunca fica exposto em produção, a menos que EXPOSE_DOCS=true seja
  // definido explicitamente (ex.: ambiente de staging protegido).
  const exposeDocs = !isProd || process.env.EXPOSE_DOCS === 'true';
  if (exposeDocs) {
    const config = new DocumentBuilder()
      .setTitle('Nuvita Psi API')
      .setDescription('SaaS de gestão clínica — autenticação, pacientes, prontuários, agendamentos, financeiro e telemedicina')
      .setVersion('0.1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .addTag('auth', 'Autenticação e sessão')
      .addTag('clinicas', 'Gestão de clínicas e usuários')
      .addTag('pacientes', 'Cadastro e busca de pacientes')
      .addTag('prontuarios', 'Prontuário eletrônico SOAP')
      .addTag('documentos', 'Upload e gestão de documentos')
      .addTag('agendamentos', 'Agenda e bloqueios')
      .addTag('financeiro', 'Lançamentos e dashboard financeiro')
      .addTag('notificacoes', 'Notificações multicanal')
      .addTag('telemedicina', 'Salas de teleconsulta')
      .addTag('analytics', 'Relatórios e métricas')
      .addTag('health', 'Health check')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = config.port;
  // A revogação de token (Redis, fail-closed) roda em toda requisição autenticada: só atende depois de o Redis conectar.
  // Sem conectar em 15 s o boot falha e a revisão nunca fica pronta (o Cloud Run não manda tráfego a ela).
  await aguardarRedisPronto(app.get<Redis>(REDIS_CLIENT), 15_000);

  await app.listen(port);
  console.log(`API rodando na porta ${port} (NODE_ENV=${config.nodeEnv})`);
  if (exposeDocs) {
    console.log(`Swagger em http://localhost:${port}/docs`);
  }
}

void bootstrap();
