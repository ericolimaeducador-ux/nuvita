import { Body, Controller, ForbiddenException, Param, Post, Req, UseGuards } from '@nestjs/common';
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

// Só o enfermeiro aciona a IA — mesmo padrão de acesso dos documentos
// clínicos. Throttle apertado: são chamadas pagas a um provedor externo,
// o limite é uma trava de custo/abuso, não uma questão de segurança. O guard
// de throttling é global (APP_GUARD); aqui fica só o @Throttle que aperta.
// R1.4 (decisão do Erico): IA clínica antiga (herdada do psi) DESLIGADA. As rotas existem, mas toda chamada responde
// 403 sem tocar o serviço nem o provedor de IA (nenhuma chamada paga, nenhum dado enviado). Telas herdadas escondem os
// botões; saem na etapa de conteúdo.
export const MSG_RECURSO_DESATIVADO = 'Recurso desativado.';

@Controller('ia-clinica')
@UseGuards(JwtAuthGuard, AuthGatesGuard, TenantRequiredGuard, RolesGuard)
@Roles(Papel.ENFERMEIRO)
@Throttle({ default: { ttl: 60_000, limit: 10 } })
export class IaClinicaController {
  constructor(private readonly service: IaClinicaService) {}

  @Post('sugerir-abordagem')
  sugerirAbordagem(
    @Body() dto: SugerirAbordagemDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ): never {
    void [dto, user, request];
    throw new ForbiddenException(MSG_RECURSO_DESATIVADO);
  }

  @Post('gerar-prescricao')
  gerarPrescricao(
    @Body() dto: GerarPrescricaoDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ): never {
    void [dto, user, request];
    throw new ForbiddenException(MSG_RECURSO_DESATIVADO);
  }

  @Post('registros/:id/decisao')
  registrarDecisao(
    @Param('id') registroUsoIaId: string,
    @Body() dto: RegistrarDecisaoDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ): never {
    void [registroUsoIaId, dto, user, request];
    throw new ForbiddenException(MSG_RECURSO_DESATIVADO);
  }

  private contexto(request: Request, user: AuthTokenPayload): IaClinicaRequestContext {
    return { ...extractRequestMeta(request), user };
  }
}
