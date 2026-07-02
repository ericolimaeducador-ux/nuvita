import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { AuthTokenPayload, PAPEIS_PROFISSIONAIS } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { Cid10QueryDto } from '../application/dto/cid10-query.dto';
import { CreateAddendumDto } from '../application/dto/create-addendum.dto';
import { CreateProntuarioDto } from '../application/dto/create-prontuario.dto';
import { ListProntuariosQueryDto } from '../application/dto/list-prontuarios-query.dto';
import { UpdateProntuarioDto } from '../application/dto/update-prontuario.dto';
import { ProntuarioRequestContext, ProntuariosService } from '../application/prontuarios.service';

@Controller('prontuarios')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard)
@Roles(...PAPEIS_PROFISSIONAIS)
export class ProntuariosController {
  constructor(private readonly prontuariosService: ProntuariosService) {}

  @Post()
  create(
    @Body() dto: CreateProntuarioDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.prontuariosService.create(dto, this.contextFromRequest(request, user));
  }

  @Get()
  listByPaciente(
    @Query() query: ListProntuariosQueryDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.prontuariosService.listByPaciente(query, this.contextFromRequest(request, user));
  }

  @Get('cid10/autocomplete')
  autocompleteCid10(
    @Query() query: Cid10QueryDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.prontuariosService.autocompleteCid10(
      query.q,
      query.limit,
      this.contextFromRequest(request, user),
    );
  }

  @Get(':id')
  findOne(
    @Param('id') prontuarioId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.prontuariosService.findOne(prontuarioId, clinicaId, this.contextFromRequest(request, user));
  }

  @Patch(':id')
  updateDraft(
    @Param('id') prontuarioId: string,
    @Body() dto: UpdateProntuarioDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.prontuariosService.updateDraft(
      prontuarioId,
      dto,
      clinicaId,
      this.contextFromRequest(request, user),
    );
  }

  @Post(':id/assinar')
  sign(
    @Param('id') prontuarioId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.prontuariosService.sign(prontuarioId, clinicaId, this.contextFromRequest(request, user));
  }

  @Post(':id/addendums')
  createAddendum(
    @Param('id') prontuarioId: string,
    @Body() dto: CreateAddendumDto,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.prontuariosService.createAddendum(
      prontuarioId,
      dto,
      clinicaId,
      this.contextFromRequest(request, user),
    );
  }

  @Get(':id/addendums')
  listAddendums(
    @Param('id') prontuarioId: string,
    @Query('clinicaId') clinicaId: string | undefined,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.prontuariosService.listAddendums(
      prontuarioId,
      clinicaId,
      this.contextFromRequest(request, user),
    );
  }

  private contextFromRequest(request: Request, user: AuthTokenPayload): ProntuarioRequestContext {
    return {
      ...extractRequestMeta(request),
      user,
    };
  }
}
