import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { NotificacoesModule } from '../notificacoes/notificacoes.module';
import { FollowUpService } from './application/followup.service';
import { FollowUpMongoRepository } from './infrastructure/mongo/followup-mongo.repository';
import { FollowUpMongo, FollowUpSchema } from './infrastructure/mongo/followup.schema';
import { FOLLOWUP_REPOSITORY } from './followup.constants';
import { FollowUpController } from './presentation/followup.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FollowUpMongo.name, schema: FollowUpSchema }]),
    NotificacoesModule,
  ],
  controllers: [FollowUpController],
  providers: [
    FollowUpService,
    JwtAuthGuard,
    RolesGuard,
    { provide: FOLLOWUP_REPOSITORY, useClass: FollowUpMongoRepository },
  ],
  exports: [FollowUpService],
})
export class FollowUpModule {}
