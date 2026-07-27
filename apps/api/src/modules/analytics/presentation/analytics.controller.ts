import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { AnalyticsService } from '../application/analytics.service';
import { AnalyticsQueryDto } from '../application/dto/analytics-query.dto';

// Este sistema não restringe por papel/módulo: qualquer usuário autenticado
// da clínica (RolesGuard removido de propósito) enxerga os relatórios —
// mesma decisão já aplicada em PERMISSOES_PADRAO_POR_PAPEL.
@Controller('analytics')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
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

  @Get('pacientes-por-cateter')
  pacientesPorCateter(@Query() query: AnalyticsQueryDto, @CurrentUser() user: AuthTokenPayload) {
    const clinicaId = this.analyticsService.resolveClinicaId(user, query.clinicaId);
    return this.analyticsService.pacientesPorCateter(clinicaId);
  }

  @Get('pacientes-por-representante')
  pacientesPorRepresentante(@Query() query: AnalyticsQueryDto, @CurrentUser() user: AuthTokenPayload) {
    const clinicaId = this.analyticsService.resolveClinicaId(user, query.clinicaId);
    return this.analyticsService.pacientesPorRepresentante(clinicaId);
  }

  @Get('entregas-no-mes')
  entregasNoMes(@Query() query: AnalyticsQueryDto, @CurrentUser() user: AuthTokenPayload) {
    const clinicaId = this.analyticsService.resolveClinicaId(user, query.clinicaId);
    const { dataInicio, dataFim } = this.period(query);
    return this.analyticsService.entregasNoPeriodo(clinicaId, dataInicio, dataFim);
  }

  @Get('sondas-no-mes')
  sondasNoMes(@Query() query: AnalyticsQueryDto, @CurrentUser() user: AuthTokenPayload) {
    const clinicaId = this.analyticsService.resolveClinicaId(user, query.clinicaId);
    const { dataInicio, dataFim } = this.period(query);
    return this.analyticsService.sondasNoPeriodo(clinicaId, dataInicio, dataFim);
  }

  @Get('aguardando-relatorio')
  aguardandoRelatorio(@Query() query: AnalyticsQueryDto, @CurrentUser() user: AuthTokenPayload) {
    const clinicaId = this.analyticsService.resolveClinicaId(user, query.clinicaId);
    return this.analyticsService.pacientesAguardandoRelatorio(clinicaId);
  }

  @Get('pacientes-por-etapa')
  pacientesPorEtapa(@Query() query: AnalyticsQueryDto, @CurrentUser() user: AuthTokenPayload) {
    const clinicaId = this.analyticsService.resolveClinicaId(user, query.clinicaId);
    return this.analyticsService.pacientesPorEtapaFluxo(clinicaId);
  }

  private period(query: AnalyticsQueryDto) {
    if (query.dataInicio && query.dataFim) {
      return { dataInicio: new Date(query.dataInicio), dataFim: new Date(query.dataFim) };
    }
    return this.analyticsService.defaultPeriod();
  }
}
