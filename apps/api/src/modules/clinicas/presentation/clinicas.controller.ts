import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { ClinicAdminContext, ClinicasService } from '../application/clinicas.service';
import { CreateClinicaUsuarioDto } from '../application/dto/create-clinica-usuario.dto';

@Controller('clinicas')
export class ClinicasController {
  constructor(private readonly clinicasService: ClinicasService) {}

  @Post(':clinicaId/usuarios')
  @UseGuards(JwtAuthGuard, RolesGuard)
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
    const forwardedFor = request.headers['x-forwarded-for'];
    const ip = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0]?.trim() || request.ip || 'unknown';

    return {
      ip,
      userAgent: request.headers['user-agent'] ?? 'unknown',
      user,
    };
  }
}
