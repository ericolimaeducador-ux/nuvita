import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { AnalyticsService } from '../application/analytics.service';
import { AnalyticsQueryDto } from '../application/dto/analytics-query.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
@Roles(Papel.ADMIN, Papel.SECRETARIA)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('pacientes')
  pacientes(@Query() query: AnalyticsQueryDto, @CurrentUser() user: AuthTokenPayload) {
    const clinicaId = this.analyticsService.resolveClinicaId(user, query.clinicaId);
    const { dataInicio, dataFim } = this.period(query);
    return this.analyticsService.pacientes(clinicaId, dataInicio, dataFim);
  }

  @Get('agendamentos')
  agendamentos(@Query() query: AnalyticsQueryDto, @CurrentUser() user: AuthTokenPayload) {
    const clinicaId = this.analyticsService.resolveClinicaId(user, query.clinicaId);
    const { dataInicio, dataFim } = this.period(query);
    return this.analyticsService.agendamentos(clinicaId, dataInicio, dataFim);
  }

  @Get('financeiro')
  financeiro(@Query() query: AnalyticsQueryDto, @CurrentUser() user: AuthTokenPayload) {
    const clinicaId = this.analyticsService.resolveClinicaId(user, query.clinicaId);
    const { dataInicio, dataFim } = this.period(query);
    return this.analyticsService.financeiro(clinicaId, dataInicio, dataFim);
  }

  @Get('notificacoes')
  notificacoes(@Query() query: AnalyticsQueryDto, @CurrentUser() user: AuthTokenPayload) {
    const clinicaId = this.analyticsService.resolveClinicaId(user, query.clinicaId);
    const { dataInicio, dataFim } = this.period(query);
    return this.analyticsService.notificacoes(clinicaId, dataInicio, dataFim);
  }

  private period(query: AnalyticsQueryDto) {
    if (query.dataInicio && query.dataFim) {
      return { dataInicio: new Date(query.dataInicio), dataFim: new Date(query.dataFim) };
    }
    return this.analyticsService.defaultPeriod();
  }
}
