import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { AuthGatesGuard } from '../../auth/presentation/guards/auth-gates.guard';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { EmitirDocumentoDto } from '../application/dto/emitir-documento.dto';
import { DocumentosEmitidosService, EmissaoContext } from '../application/documentos-emitidos.service';

@Controller('documentos-emitidos')
@UseGuards(JwtAuthGuard, AuthGatesGuard, TenantRequiredGuard, RolesGuard)
export class DocumentosEmitidosController {
  constructor(private readonly service: DocumentosEmitidosService) {}

  @Post('declaracao-comparecimento')
  @Roles(Papel.SECRETARIA, Papel.PSICOLOGO, Papel.ADMIN)
  declaracao(@Body() dto: EmitirDocumentoDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.service.emitirDeclaracao(dto, this.ctx(req, user));
  }

  @Post('atestado-comparecimento')
  @Roles(Papel.PSICOLOGO)
  atestado(@Body() dto: EmitirDocumentoDto, @CurrentUser() user: AuthTokenPayload, @Req() req: Request) {
    return this.service.emitirAtestado(dto, this.ctx(req, user));
  }

  private ctx(req: Request, user: AuthTokenPayload): EmissaoContext {
    return { ...extractRequestMeta(req), user };
  }
}
