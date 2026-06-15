import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet({ contentSecurityPolicy: process.env.NODE_ENV === 'production' }));
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? false,
    credentials: true,
  });

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Nuvita API')
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

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`API rodando em http://localhost:${port}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Swagger em http://localhost:${port}/docs`);
  }
}

void bootstrap();
