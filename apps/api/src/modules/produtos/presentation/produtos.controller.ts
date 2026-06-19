import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../../../common/tenancy/tenant-required.guard';
import { ProdutosService } from '../application/produtos.service';
import { TipoProduto } from '../domain/produto.entity';

@Controller('produtos')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class ProdutosController {
  constructor(private readonly service: ProdutosService) {}

  @Get()
  listar(@Query('tipo') tipo?: TipoProduto) {
    return this.service.listar(tipo);
  }

  @Get(':codigo')
  buscar(@Param('codigo') codigo: string) {
    return this.service.buscarPorCodigo(Number(codigo));
  }
}
