import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { Roles } from '../../auth/presentation/decorators/roles.decorator';
import { AuthGatesGuard } from '../../auth/presentation/guards/auth-gates.guard';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/presentation/guards/roles.guard';
import { AtualizarStatusInscricaoDto } from '../application/dto/atualizar-status-inscricao.dto';
import { CriarInscricaoTesteDto } from '../application/dto/criar-inscricao-teste.dto';
import { InscricoesTesteService } from '../application/inscricoes-teste.service';

@Controller('inscricoes-teste')
export class InscricoesTesteController {
  constructor(private readonly inscricoes: InscricoesTesteService) {}

  // PÚBLICA (landing do teste beta). Teto apertado por IP além do limite global.
  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  criar(@Body() dto: CriarInscricaoTesteDto, @Req() request: Request) {
    return this.inscricoes.criar(dto, extractRequestMeta(request));
  }

  @Get()
  @UseGuards(JwtAuthGuard, AuthGatesGuard, RolesGuard)
  @Roles(Papel.SUPER_ADMIN)
  listar() {
    return this.inscricoes.listar();
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, AuthGatesGuard, RolesGuard)
  @Roles(Papel.SUPER_ADMIN)
  atualizarStatus(@Param('id') id: string, @Body() dto: AtualizarStatusInscricaoDto) {
    return this.inscricoes.atualizarStatus(id, dto.status);
  }
}
