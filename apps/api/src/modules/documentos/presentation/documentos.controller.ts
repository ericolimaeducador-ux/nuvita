import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { CreateUploadUrlDto } from '../application/dto/create-upload-url.dto';
import { ListDocumentosQueryDto } from '../application/dto/list-documentos-query.dto';
import { DocumentoRequestContext, DocumentosService } from '../application/documentos.service';

@Controller('documentos')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
@Roles(Papel.SECRETARIA, Papel.MEDICO, Papel.ADMIN)
export class DocumentosController {
  constructor(private readonly documentosService: DocumentosService) {}

  @Post('presign-upload')
  createUploadUrl(
    @Body() dto: CreateUploadUrlDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.documentosService.createUploadUrl(dto, this.contextFromRequest(request, user));
  }

  @Get()
  list(
    @Query() query: ListDocumentosQueryDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.documentosService.list(query, this.contextFromRequest(request, user));
  }

  @Post(':id/confirmar-upload')
  confirmUpload(
    @Param('id') documentoId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.documentosService.confirmUpload(documentoId, clinicaId, this.contextFromRequest(request, user));
  }

  @Get(':id/access-url')
  createAccessUrl(
    @Param('id') documentoId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.documentosService.createAccessUrl(documentoId, clinicaId, this.contextFromRequest(request, user));
  }

  @Patch(':id/excluir')
  softDelete(
    @Param('id') documentoId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.documentosService.softDelete(documentoId, clinicaId, this.contextFromRequest(request, user));
  }

  private contextFromRequest(request: Request, user: AuthTokenPayload): DocumentoRequestContext {
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
