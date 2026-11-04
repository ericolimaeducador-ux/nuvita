import { Body, Controller, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { extractRequestMeta } from '../../../common/http/client-ip';
import { AllowWithoutTenant } from '../../../common/tenancy/tenant-required.guard';
import { EsqueciSenhaDto } from '../application/dto/esqueci-senha.dto';
import { RedefinirSenhaDto } from '../application/dto/redefinir-senha.dto';
import { PasswordResetService } from '../application/password-reset.service';

// Públicos e sem oráculo: a resposta do pedido não depende de o e-mail existir.
// O limite por IP é apertado aqui; o limite por conta fica no PasswordResetLimiterService.
@Controller('auth')
export class PasswordResetController {
  constructor(private readonly passwordReset: PasswordResetService) {}

  @Post('esqueci-senha')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @AllowWithoutTenant()
  esqueciSenha(@Body() dto: EsqueciSenhaDto, @Req() request: Request) {
    return this.passwordReset.solicitar(dto.email, extractRequestMeta(request));
  }

  @Post('redefinir-senha')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @AllowWithoutTenant()
  redefinirSenha(@Body() dto: RedefinirSenhaDto, @Req() request: Request) {
    return this.passwordReset.redefinir(dto.token, dto.novaSenha, extractRequestMeta(request));
  }
}
