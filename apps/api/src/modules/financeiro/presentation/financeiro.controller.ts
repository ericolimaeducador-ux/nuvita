import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { AuthGatesGuard } from '../../auth/presentation/guards/auth-gates.guard';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { FinanceiroService, RequestAuditContext } from '../application/financeiro.service';
import { CreateLancamentoDto } from '../application/dto/create-lancamento.dto';
import { FinancialDashboardQueryDto } from '../application/dto/financial-dashboard-query.dto';
import { ListLancamentosQueryDto } from '../application/dto/list-lancamentos-query.dto';
import { ReceiveLancamentoDto } from '../application/dto/receive-lancamento.dto';

@Controller('financeiro')
// Financeiro legado da clínica, SEM tela no web: só a plataforma. O único financeiro do produto é o da
// psicologia (PsicologiaFinanceiroController). Admin e secretária não acessam.
@UseGuards(JwtAuthGuard, AuthGatesGuard, TenantRequiredGuard, RolesGuard)
@Roles(Papel.SUPER_ADMIN)
export class FinanceiroController {
  constructor(private readonly financeiroService: FinanceiroService) {}

  @Post('lancamentos')
    create(@Body() dto: CreateLancamentoDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.financeiroService.create(dto, this.ctx(req, user));
  }

  @Get('lancamentos')
    list(@Query() query: ListLancamentosQueryDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.financeiroService.list(query, this.ctx(req, user));
  }

  @Get('dashboard')
    dashboard(@Query() query: FinancialDashboardQueryDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.financeiroService.dashboard(query, this.ctx(req, user));
  }

  @Get('lancamentos/:id')
    findOne(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.financeiroService.findOne(id, clinicaId, this.ctx(req, user));
  }

  @Patch('lancamentos/:id/receber')
    receive(
    @Param('id') id: string,
    @Body() dto: ReceiveLancamentoDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.financeiroService.receive(id, dto, clinicaId, this.ctx(req, user));
  }

  @Patch('lancamentos/:id/cancelar')
    cancel(
    @Param('id') id: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.financeiroService.cancel(id, clinicaId, this.ctx(req, user));
  }

  private ctx(req: Request, user: AuthTokenPayload): RequestAuditContext {
    return { ...extractRequestMeta(req), user };
  }
}
