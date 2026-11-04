import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { AuthGatesGuard } from '../../auth/presentation/guards/auth-gates.guard';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { IaClinicaRequestContext, IaClinicaService } from '../application/ia-clinica.service';
import { SugerirAbordagemDto } from '../application/dto/sugerir-abordagem.dto';
import { GerarPrescricaoDto } from '../application/dto/gerar-prescricao.dto';
import { RegistrarDecisaoDto } from '../application/dto/registrar-decisao.dto';

// Só o psicólogo aciona a IA — mesmo padrão de acesso dos documentos
// clínicos. Throttle apertado: são chamadas pagas a um provedor externo,
// o limite é uma trava de custo/abuso, não uma questão de segurança. O guard
// de throttling é global (APP_GUARD); aqui fica só o @Throttle que aperta.
@Controller('ia-clinica')
@UseGuards(JwtAuthGuard, AuthGatesGuard, TenantRequiredGuard, RolesGuard)
@Roles(Papel.PSICOLOGO)
@Throttle({ default: { ttl: 60_000, limit: 10 } })
export class IaClinicaController {
  constructor(private readonly service: IaClinicaService) {}

  @Post('sugerir-abordagem')
  sugerirAbordagem(
    @Body() dto: SugerirAbordagemDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.sugerirAbordagem(dto, this.contexto(request, user));
  }

  @Post('gerar-prescricao')
  gerarPrescricao(
    @Body() dto: GerarPrescricaoDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.gerarPrescricao(dto, this.contexto(request, user));
  }

  @Post('registros/:id/decisao')
  registrarDecisao(
    @Param('id') registroUsoIaId: string,
    @Body() dto: RegistrarDecisaoDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.registrarDecisao(
      registroUsoIaId,
      dto.decisao,
      this.contexto(request, user),
    );
  }

  private contexto(request: Request, user: AuthTokenPayload): IaClinicaRequestContext {
    return { ...extractRequestMeta(request), user };
  }
}
