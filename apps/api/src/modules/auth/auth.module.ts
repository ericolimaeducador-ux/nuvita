import { Inject, Logger, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Redis from 'ioredis';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { AUDIT_LOG_REPOSITORY, REDIS_CLIENT, USER_REPOSITORY } from './auth.constants';
import { AuthService } from './application/auth.service';
import { PasswordResetService, PASSWORD_RESET_LIMITER, PASSWORD_RESET_MAILER } from './application/password-reset.service';
import { EmailSender } from '../notificacoes/infrastructure/senders/email.sender';
import { PasswordResetEmailMailer } from './infrastructure/password-reset.mailer';
import { PasswordResetLimiterService } from './infrastructure/redis/password-reset-limiter.service';
import { AuditLogMongoRepository } from './infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from './infrastructure/mongo/audit-log.schema';
import { UserMongoRepository } from './infrastructure/mongo/user-mongo.repository';
import { UserMongo, UserSchema } from './infrastructure/mongo/user.schema';
import { LoginRateLimiterService } from './infrastructure/redis/login-rate-limiter.service';
import { redisProvider } from './infrastructure/redis/redis.provider';
import { TokenRevocationService } from './infrastructure/redis/token-revocation.service';
import { AuthController } from './presentation/auth.controller';
import { PasswordResetController } from './presentation/password-reset.controller';
import { AuthGatesGuard } from './presentation/guards/auth-gates.guard';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';
import { JwtStrategy } from './presentation/guards/jwt.strategy';
import { RolesGuard } from './presentation/guards/roles.guard';
import { SuperAdminGuard } from './presentation/guards/super-admin.guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: UserMongo.name, schema: UserSchema },
      { name: AuditLogMongo.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [AuthController, PasswordResetController],
  providers: [
    AuthService,
    PasswordResetService,
    EmailSender,
    { provide: PASSWORD_RESET_MAILER, useClass: PasswordResetEmailMailer },
    { provide: PASSWORD_RESET_LIMITER, useClass: PasswordResetLimiterService },
    LoginRateLimiterService,
    TokenRevocationService,
    JwtStrategy,
    JwtAuthGuard,
    AuthGatesGuard,
    RolesGuard,
    SuperAdminGuard,
    redisProvider,
    { provide: USER_REPOSITORY, useClass: UserMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
  ],
  // REDIS_CLIENT é exportado para o HealthModule checar a MESMA conexão que a
  // autenticação usa (ver modules/health/redis.health.ts).
  exports: [
    AuthService,
    PasswordResetService,
    JwtAuthGuard,
    AuthGatesGuard,
    RolesGuard,
    SuperAdminGuard,
    USER_REPOSITORY,
    REDIS_CLIENT,
  ],
})
export class AuthModule implements OnApplicationShutdown {
  private readonly logger = new Logger(AuthModule.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * O redisProvider é um useFactory que devolve um `new Redis(...)` cru, e
   * provider de fábrica não tem ciclo de vida próprio no Nest — sem isto o
   * `enableShutdownHooks()` do main.ts fecharia o Mongo mas deixaria o socket
   * do Redis aberto até o SIGKILL, acumulando conexão órfã a cada deploy.
   */
  async onApplicationShutdown(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      // Shutdown não pode falhar por causa disto: se o Redis já caiu, o quit
      // rejeita e o processo precisa terminar mesmo assim.
      this.logger.warn(`Falha ao encerrar a conexão com o Redis: ${error}`);
    }
  }
}
