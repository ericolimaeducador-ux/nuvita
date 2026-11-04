import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/presentation/guards/roles.guard';
import { PacientesModule } from '../pacientes/pacientes.module';
import { AnalyticsService } from './application/analytics.service';
import { AnalyticsController } from './presentation/analytics.controller';

@Module({
  imports: [MongooseModule, PacientesModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, JwtAuthGuard, RolesGuard],
})
export class AnalyticsModule {}
