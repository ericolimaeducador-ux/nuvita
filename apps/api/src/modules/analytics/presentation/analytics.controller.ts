import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { AuthGatesGuard } from '../../auth/presentation/guards/auth-gates.guard';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { AnalyticsService } from '../application/analytics.service';
import {
  AnalyticsQueryDto,
  HorariosVagosQueryDto,
  RelatorioPsicologiaQueryDto,
} from '../application/dto/analytics-query.dto';

// Relatórios gerenciais: só a equipe da clínica. O papel PACIENTE NUNCA lê estes dados (trazem nomes de
// outros pacientes e o financeiro da clínica). Ver authorization-matrix.spec.ts.
@Controller('analytics')
@UseGuards(JwtAuthGuard, AuthGatesGuard, TenantRequiredGuard, RolesGuard)
@Roles(Papel.ADMIN, Papel.PSICOLOGO, Papel.SECRETARIA)
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

  @Get('pacientes-por-representante')
  pacientesPorRepresentante(@Query() query: AnalyticsQueryDto, @CurrentUser() user: AuthTokenPayload) {
    const clinicaId = this.analyticsService.resolveClinicaId(user, query.clinicaId);
    return this.analyticsService.pacientesPorRepresentante(clinicaId);
  }

  @Get('cobrancas-psicologia')
  cobrancasPsicologia(@Query() query: RelatorioPsicologiaQueryDto, @CurrentUser() user: AuthTokenPayload) {
    const clinicaId = this.analyticsService.resolveClinicaId(user, query.clinicaId);
    const profissionalId = this.analyticsService.resolveProfissionalId(user, query.profissionalId);
    return this.analyticsService.cobrancasPsicologia(clinicaId, profissionalId);
  }

  @Get('perda-seguimento')
  perdaSeguimento(@Query() query: RelatorioPsicologiaQueryDto, @CurrentUser() user: AuthTokenPayload) {
    const clinicaId = this.analyticsService.resolveClinicaId(user, query.clinicaId);
    const profissionalId = this.analyticsService.resolveProfissionalId(user, query.profissionalId);
    return this.analyticsService.perdaSeguimento(clinicaId, profissionalId, query.diasLimite);
  }

  @Get('horarios-vagos')
  horariosVagos(@Query() query: HorariosVagosQueryDto, @CurrentUser() user: AuthTokenPayload) {
    const clinicaId = this.analyticsService.resolveClinicaId(user, query.clinicaId);
    const profissionalId = this.analyticsService.resolveProfissionalId(user, query.profissionalId);
    return this.analyticsService.horariosVagos(
      clinicaId,
      new Date(query.data),
      profissionalId,
      query.horaInicio,
      query.horaFim,
      query.slotMinutos,
    );
  }

  private period(query: AnalyticsQueryDto) {
    if (query.dataInicio && query.dataFim) {
      return { dataInicio: new Date(query.dataInicio), dataFim: new Date(query.dataFim) };
    }
    return this.analyticsService.defaultPeriod();
  }
}
