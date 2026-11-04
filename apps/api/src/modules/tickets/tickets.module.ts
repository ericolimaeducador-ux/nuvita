import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AUDIT_LOG_REPOSITORY } from '../auth/auth.constants';
import { AuditLogMongoRepository } from '../auth/infrastructure/mongo/audit-log-mongo.repository';
import { AuditLogMongo, AuditLogSchema } from '../auth/infrastructure/mongo/audit-log.schema';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { PacientesModule } from '../pacientes/pacientes.module';
import { TicketsService } from './application/tickets.service';
import { TicketMongoRepository } from './infrastructure/mongo/ticket-mongo.repository';
import { TicketMongo, TicketSchema } from './infrastructure/mongo/ticket.schema';
import { TicketsController } from './presentation/tickets.controller';
import { TICKET_REPOSITORY } from './tickets.constants';

@Module({
  imports: [
    PacientesModule,
    MongooseModule.forFeature([
      { name: TicketMongo.name, schema: TicketSchema },
      { name: AuditLogMongo.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [TicketsController],
  providers: [
    TicketsService,
    JwtAuthGuard,
    RolesGuard,
    { provide: TICKET_REPOSITORY, useClass: TicketMongoRepository },
    { provide: AUDIT_LOG_REPOSITORY, useClass: AuditLogMongoRepository },
  ],
})
export class TicketsModule {}
