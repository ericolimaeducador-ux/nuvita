import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { AuthTokenPayload, PAPEIS_PROFISSIONAIS, Papel } from '../../../../../../packages/shared/src/auth';
import { CurrentUser } from '../../auth/presentation/decorators/current-user.decorator';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { AuthGatesGuard } from '../../auth/presentation/guards/auth-gates.guard';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { CreateProdutoDto } from '../application/dto/create-produto.dto';
import { ListProdutosQueryDto } from '../application/dto/list-produtos-query.dto';
import { UpdateProdutoDto } from '../application/dto/update-produto.dto';
import { ProdutoAuditContext, ProdutosService } from '../application/produtos.service';

// Catálogo operacional. Leitura: equipe clínica e gestão (ENFERMEIRO, ADMIN, SECRETARIA; SUPER_ADMIN sempre passa).
// Alteração: só ADMIN (e SUPER_ADMIN). PACIENTE não tem acesso. O catálogo é global (sem clinicaId).
const LEITURA = [...PAPEIS_PROFISSIONAIS, Papel.ADMIN, Papel.SECRETARIA];

@Controller('produtos')
@UseGuards(JwtAuthGuard, AuthGatesGuard, TenantRequiredGuard, RolesGuard)
@Roles(...LEITURA)
export class ProdutosController {
  constructor(private readonly service: ProdutosService) {}

  @Get()
  listar(@Query() query: ListProdutosQueryDto, @CurrentUser() user: AuthTokenPayload) {
    return this.service.listar(query.tipo, query.incluirInativos, user);
  }

  @Get(':codigo')
  buscar(@Param('codigo', ParseIntPipe) codigo: number) {
    return this.service.obter(codigo);
  }

  @Post()
  @Roles(Papel.ADMIN)
  criar(@Body() dto: CreateProdutoDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.criar(dto, this.contexto(request, user));
  }

  @Patch(':codigo')
  @Roles(Papel.ADMIN)
  atualizar(
    @Param('codigo', ParseIntPipe) codigo: number,
    @Body() dto: UpdateProdutoDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.atualizar(codigo, dto, this.contexto(request, user));
  }

  // "Remover": remoção lógica (ativo=false), como nas demais exclusões do sistema.
  @Patch(':codigo/desativar')
  @Roles(Papel.ADMIN)
  desativar(@Param('codigo', ParseIntPipe) codigo: number, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.desativar(codigo, this.contexto(request, user));
  }

  private contexto(request: Request, user: AuthTokenPayload): ProdutoAuditContext {
    return { ...extractRequestMeta(request), user };
  }
}
