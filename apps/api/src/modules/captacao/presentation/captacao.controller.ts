import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { AuthTokenPayload, PAPEIS_PROFISSIONAIS, Papel } from '../../../../../../packages/shared/src/auth';
import { RequestAuditContext } from '../../pacientes/application/pacientes.service';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { AuthGatesGuard } from '../../auth/presentation/guards/auth-gates.guard';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { CaptacaoService } from '../application/captacao.service';
import { CreateCaptacaoDto } from '../application/dto/create-captacao.dto';
import { CaptadorPinGuard } from './captador-pin.guard';

// Gestão da fila de captação: equipe da clínica (enfermeiro, admin, secretaria; SUPER_ADMIN sempre passa). PACIENTE não.
const PAPEIS_CAPTACAO = [Papel.SECRETARIA, ...PAPEIS_PROFISSIONAIS, Papel.ADMIN];

@Controller('captacao')
export class CaptacaoController {
  constructor(private readonly captacao: CaptacaoService) {}

  /**
   * PÚBLICA, protegida só pelo PIN dos captadores (header x-captador-pin; env PIN_CAPTADOR). Teto apertado por IP além do
   * limite global. A página é /captacao_pacientes.
   */
  @Post()
  @HttpCode(201)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @UseGuards(CaptadorPinGuard)
  create(@Body() dto: CreateCaptacaoDto, @Req() request: Request) {
    return this.captacao.create(dto, extractRequestMeta(request));
  }

  @Get()
  @UseGuards(JwtAuthGuard, AuthGatesGuard, TenantRequiredGuard, RolesGuard)
  @Roles(...PAPEIS_CAPTACAO)
  listPending() {
    return this.captacao.listPending();
  }

  @Post(':id/exportar')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard, AuthGatesGuard, TenantRequiredGuard, RolesGuard)
  @Roles(...PAPEIS_CAPTACAO)
  exportar(@Param('id') id: string, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.captacao.exportar(id, this.contextFromRequest(request, user));
  }

  private contextFromRequest(request: Request, user: AuthTokenPayload): RequestAuditContext {
    return {
      ...extractRequestMeta(request),
      user,
    };
  }
}
