import { Body, Controller, Patch, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { AuthGatesGuard } from '../../auth/presentation/guards/auth-gates.guard';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { ClinicasService } from '../application/clinicas.service';
import { PreencherDocumentoDto } from '../application/dto/preencher-documento.dto';

/**
 * Primeiro uso (feature-clinic-fiscal-document-first-use): a psicóloga informa o documento do PRÓPRIO consultório,
 * uma única vez (a trava é o filtro atômico do update). Depois só o super-admin corrige. Fica fora do
 * ClinicasController de propósito: aquele é a rota do ADMIN e não grava documento.
 */
@Controller('clinicas/minha')
export class ClinicaDocumentoController {
  constructor(private readonly clinicasService: ClinicasService) {}

  @Patch('documento')
  @UseGuards(JwtAuthGuard, AuthGatesGuard, TenantRequiredGuard, RolesGuard)
  @Roles(Papel.PSICOLOGO)
  preencherDocumento(@Body() dto: PreencherDocumentoDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.clinicasService.preencherDocumento(dto, { ...extractRequestMeta(request), user });
  }
}
