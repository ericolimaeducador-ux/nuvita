import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { AUDIT_LOG_REPOSITORY, USER_REPOSITORY } from '../auth/auth.constants';
import { AuditLogMongoRepository } from '../auth/infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from '../auth/infrastructure/mongo/audit-log.schema';
import { UserMongoRepository } from '../auth/infrastructure/mongo/user-mongo.repository';
import { UserMongo, UserSchema } from '../auth/infrastructure/mongo/user.schema';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { TenantContextService } from '../../common/tenancy/tenant-context.service';
import { TenantMiddleware } from '../../common/tenancy/tenant.middleware';
import { TenantRequiredGuard } from '../../common/tenancy/tenant-required.guard';
import { ClinicasService } from './application/clinicas.service';
import { CLINICA_REPOSITORY } from './clinicas.constants';
import { ClinicaMongoRepository } from './infrastructure/mongo/clinica-mongo.repository';
import { ClinicaMongo, ClinicaSchema } from './infrastructure/mongo/clinica.schema';
import { ClinicasController } from './presentation/clinicas.controller';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: ClinicaMongo.name, schema: ClinicaSchema },
      { name: UserMongo.name, schema: UserSchema },
      { name: AuditLogMongo.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [ClinicasController],
  providers: [
    ClinicasService,
    TenantContextService,
    TenantMiddleware,
    TenantRequiredGuard,
    JwtAuthGuard,
    RolesGuard,
    { provide: CLINICA_REPOSITORY, useClass: ClinicaMongoRepository },
    { provide: USER_REPOSITORY, useClass: UserMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
  ],
  exports: [ClinicasService, TenantContextService, TenantRequiredGuard],
})
export class ClinicasModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
