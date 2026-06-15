import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { AUDIT_LOG_REPOSITORY, USER_REPOSITORY } from './auth.constants';
import { AuthService } from './application/auth.service';
import { AuditLogMongoRepository } from './infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from './infrastructure/mongo/audit-log.schema';
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
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LoginRateLimiterService,
    TokenRevocationService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    SuperAdminGuard,
    redisProvider,
    { provide: USER_REPOSITORY, useClass: UserMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, SuperAdminGuard],
})
export class AuthModule {}
