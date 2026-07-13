import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { RequestAuditContext } from '../application/financeiro.service';
import { PsicologiaFinanceiroService } from '../application/psicologia-financeiro.service';
import { CobrarCicloDto } from '../application/dto/cobrar-ciclo.dto';
import { SalvarConfigPsicologoDto } from '../application/dto/salvar-config-psicologo.dto';

/** Recebimento das consultas do psicólogo autônomo — separado do financeiro da clínica. */
@Controller('financeiro/psicologia')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
@Roles(Papel.PSICOLOGO, Papel.ADMIN)
export class PsicologiaFinanceiroController {
  constructor(private readonly service: PsicologiaFinanceiroService) {}

  @Get('painel')
  painel(
    @Query('profissionalId') profissionalId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() req: Request,
  ) {
    return this.service.painel(profissionalId, this.ctx(req, user));
  }

  @Post('configuracao')
  salvarConfig(@Body() dto: SalvarConfigPsicologoDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.service.salvarConfig(dto, this.ctx(req, user));
  }

  @Post('cobrancas')
  cobrar(@Body() dto: CobrarCicloDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.service.cobrarCiclo(dto, this.ctx(req, user));
  }

  @Patch('cobrancas/:id/receber')
  receber(@Param('id') id: string, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.service.receber(id, this.ctx(req, user));
  }

  @Patch('cobrancas/:id/cancelar')
  cancelar(@Param('id') id: string, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.service.cancelar(id, this.ctx(req, user));
  }

  private ctx(req: Request, user: AuthTokenPayload): RequestAuditContext {
    const { ip, userAgent } = extractRequestMeta(req);
    return { ip, userAgent, user };
  }
}
