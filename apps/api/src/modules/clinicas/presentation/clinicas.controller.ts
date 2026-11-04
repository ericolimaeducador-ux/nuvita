import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { AuthGatesGuard } from '../../auth/presentation/guards/auth-gates.guard';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { ClinicaLogoService } from '../application/clinica-logo.service';
import { ClinicAdminContext, ClinicasService } from '../application/clinicas.service';
import { ConfirmarLogoDto, SolicitarUploadLogoDto } from '../application/dto/logo-clinica.dto';
import { CreateClinicaUsuarioDto } from '../application/dto/create-clinica-usuario.dto';

@Controller('clinicas')
export class ClinicasController {
  constructor(
    private readonly clinicasService: ClinicasService,
    private readonly logoService: ClinicaLogoService,
  ) {}

  // Declarada antes das rotas com :clinicaId. Sem @Param/@Query: o tenant vem só do token.
  @Get('minha')
  @UseGuards(JwtAuthGuard, AuthGatesGuard, TenantRequiredGuard, RolesGuard)
  @Roles(Papel.ADMIN, Papel.PSICOLOGO, Papel.SECRETARIA)
  minha(@CurrentUser() user: AuthTokenPayload) {
    return this.clinicasService.obterMinha(user);
  }

  // Logo: sem TenantRequiredGuard (o SUPER_ADMIN não tem clínica no token). O isolamento do ADMIN
  // (só a própria clínica) é decidido no ClinicaLogoService.
  @Post(':clinicaId/logo/upload-url')
  @UseGuards(JwtAuthGuard, AuthGatesGuard, RolesGuard)
  @Roles(Papel.ADMIN, Papel.SUPER_ADMIN)
  @HttpCode(200)
  solicitarUploadLogo(
    @Param('clinicaId') clinicaId: string,
    @Body() dto: SolicitarUploadLogoDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.logoService.solicitarUpload(user, clinicaId, dto, extractRequestMeta(request));
  }

  @Post(':clinicaId/logo/confirmar')
  @UseGuards(JwtAuthGuard, AuthGatesGuard, RolesGuard)
  @Roles(Papel.ADMIN, Papel.SUPER_ADMIN)
  @HttpCode(204)
  async confirmarLogo(
    @Param('clinicaId') clinicaId: string,
    @Body() dto: ConfirmarLogoDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ): Promise<void> {
    await this.logoService.confirmar(user, clinicaId, dto, extractRequestMeta(request));
  }

  @Delete(':clinicaId/logo')
  @UseGuards(JwtAuthGuard, AuthGatesGuard, RolesGuard)
  @Roles(Papel.ADMIN, Papel.SUPER_ADMIN)
  @HttpCode(204)
  async removerLogo(
    @Param('clinicaId') clinicaId: string,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ): Promise<void> {
    await this.logoService.remover(user, clinicaId, extractRequestMeta(request));
  }

  @Post(':clinicaId/usuarios')
  @UseGuards(JwtAuthGuard, AuthGatesGuard, TenantRequiredGuard, RolesGuard)
  @Roles(Papel.ADMIN)
  createUsuario(
    @Param('clinicaId') clinicaId: string,
    @Body() dto: CreateClinicaUsuarioDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.clinicasService.createUsuario(clinicaId, dto, this.contextFromRequest(request, user));
  }

  private contextFromRequest(request: Request, user: AuthTokenPayload): ClinicAdminContext {
    return {
      ...extractRequestMeta(request),
      user,
    };
  }
}
