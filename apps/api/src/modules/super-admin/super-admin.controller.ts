import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { extractRequestMeta } from '../../common/http/client-ip';
import { AuthTokenPayload } from '../../../../../packages/shared/src/auth';
import { AuthGatesGuard } from '../auth/presentation/guards/auth-gates.guard';
import { CurrentUser } from '../auth/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/presentation/guards/super-admin.guard';
import { AllowWithoutTenant } from '../../common/tenancy/tenant-required.guard';
import { PasswordResetService } from '../auth/application/password-reset.service';
import { SuperAdminService } from './super-admin.service';
import { ListUsersQueryDto } from './application/dto/list-users-query.dto';
import { UpdateUserDto } from './application/dto/update-user.dto';
import { CreateAdminUserDto } from './application/dto/create-admin-user.dto';
import { CriarClinicaDto } from './application/dto/criar-clinica.dto';
import { ResetPasswordDto } from './application/dto/reset-password.dto';
import { UpdateClinicaDto } from './application/dto/update-clinica.dto';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, AuthGatesGuard, SuperAdminGuard)
@AllowWithoutTenant()
export class SuperAdminController {
  constructor(
    private readonly service: SuperAdminService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  @Get('clinicas')
  listClinicas() {
    return this.service.listClinicas();
  }

  @Post('clinicas')
  criarClinica(
    @Body() dto: CriarClinicaDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.criarClinica(dto, {
      ...extractRequestMeta(request),
      userId: user.sub,
    });
  }

  @Patch('clinicas/:id')
  updateClinica(
    @Param('id') id: string,
    @Body() dto: UpdateClinicaDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.updateClinica(id, dto, { ...extractRequestMeta(request), userId: user.sub });
  }

  @Get('usuarios')
  listUsuarios(@Query() query: ListUsersQueryDto) {
    return this.service.listUsuarios(query);
  }

  @Get('usuarios/:id')
  getUsuario(@Param('id') id: string) {
    return this.service.getUsuario(id);
  }

  @Post('usuarios')
  createUsuario(@Body() dto: CreateAdminUserDto, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    return this.service.createUsuario(dto, { ...extractRequestMeta(request), userId: user.sub });
  }

  @Patch('usuarios/:id')
  updateUsuario(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    return this.service.updateUsuario(id, dto, { ...extractRequestMeta(request), userId: user.sub });
  }

  @Post('usuarios/:id/reset-password')
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() user: AuthTokenPayload,
    @Req() request: Request,
  ) {
    const result = await this.service.resetPassword(id, dto.novaSenha);
    const alvo = await this.service.getUsuario(id);
    await this.passwordReset.registrarResetPeloAdmin(
      'SENHA', { id, email: alvo.email }, { userId: user.sub, email: user.email }, extractRequestMeta(request),
    );
    return result;
  }

  @Post('usuarios/:id/reset-2fa')
  async reset2fa(@Param('id') id: string, @CurrentUser() user: AuthTokenPayload, @Req() request: Request) {
    const result = await this.service.reset2fa(id);
    const alvo = await this.service.getUsuario(id);
    await this.passwordReset.registrarResetPeloAdmin(
      '2FA', { id, email: alvo.email }, { userId: user.sub, email: user.email }, extractRequestMeta(request),
    );
    return result;
  }

  // Quem pediu / concluiu / está travado na recuperação de senha (autoatendimento e super-admin).
  @Get('recuperacao-senha')
  recuperacaoSenha() {
    return this.passwordReset.listarRecentes();
  }
}
