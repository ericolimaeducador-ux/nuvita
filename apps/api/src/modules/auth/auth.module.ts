import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { RedisRateLimiterService } from '../../common/security/redis-rate-limiter.service';
import { EmailSender } from '../notificacoes/infrastructure/senders/email.sender';
import { WhatsAppSender } from '../notificacoes/infrastructure/senders/whatsapp.sender';
import { AUDIT_LOG_REPOSITORY, PASSWORD_RECOVERY_TOKEN_REPOSITORY, USER_REPOSITORY } from './auth.constants';
import { AccountRecoveryService } from './application/account-recovery.service';
import { AuthService } from './application/auth.service';
import { AuditLogMongoRepository } from './infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from './infrastructure/mongo/audit-log.schema';
import { PasswordRecoveryTokenMongoRepository } from './infrastructure/mongo/password-recovery-token-mongo.repository';
import { PasswordRecoveryTokenMongo, PasswordRecoveryTokenSchema } from './infrastructure/mongo/password-recovery-token.schema';
import { UserMongoRepository } from './infrastructure/mongo/user-mongo.repository';
import { UserMongo, UserSchema } from './infrastructure/mongo/user.schema';
import { LoginRateLimiterService } from './infrastructure/redis/login-rate-limiter.service';
import { redisProvider } from './infrastructure/redis/redis.provider';
import { TokenRevocationService } from './infrastructure/redis/token-revocation.service';
import { AuthController } from './presentation/auth.controller';
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
      { name: PasswordRecoveryTokenMongo.name, schema: PasswordRecoveryTokenSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccountRecoveryService,
    LoginRateLimiterService,
    RedisRateLimiterService,
    TokenRevocationService,
    // EmailSender/WhatsAppSender também são registrados dentro de
    // NotificacoesModule — reprovisionados aqui pra recuperação de conta poder
    // enviar direto, sem passar pela fila/janela de 8h-22h daquele módulo.
    // São stateless (só dependem de AppConfigService), sem custo de duplicar.
    EmailSender,
    WhatsAppSender,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    SuperAdminGuard,
    redisProvider,
    { provide: USER_REPOSITORY, useClass: UserMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
    { provide: PASSWORD_RECOVERY_TOKEN_REPOSITORY, useClass: PasswordRecoveryTokenMongoRepository },
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, SuperAdminGuard, USER_REPOSITORY],
})
export class AuthModule {}
