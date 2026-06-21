import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/presentation/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/presentation/guards/super-admin.guard';
import { AllowWithoutTenant } from '../../common/tenancy/tenant-required.guard';
import { SuperAdminService } from './super-admin.service';
import { ListUsersQueryDto } from './application/dto/list-users-query.dto';
import { UpdateUserDto } from './application/dto/update-user.dto';
import { CreateAdminUserDto } from './application/dto/create-admin-user.dto';
import { ResetPasswordDto } from './application/dto/reset-password.dto';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@AllowWithoutTenant()
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  @Get('usuarios')
  listUsuarios(@Query() query: ListUsersQueryDto) {
    return this.service.listUsuarios(query);
  }

  @Get('usuarios/:id')
  getUsuario(@Param('id') id: string) {
    return this.service.getUsuario(id);
  }

  @Post('usuarios')
  createUsuario(@Body() dto: CreateAdminUserDto) {
    return this.service.createUsuario(dto);
  }

  @Patch('usuarios/:id')
  updateUsuario(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.updateUsuario(id, dto);
  }

  @Post('usuarios/:id/reset-password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.service.resetPassword(id, dto.novaSenha);
  }
}
