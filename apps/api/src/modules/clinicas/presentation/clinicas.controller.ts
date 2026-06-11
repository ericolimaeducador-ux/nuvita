import { Body, Controller, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { AllowWithoutTenant } from '../../../common/tenancy/tenant-required.guard';
import { ClinicasService, OnboardingContext } from '../application/clinicas.service';
import { CreateClinicaDto } from '../application/dto/create-clinica.dto';

@Controller('clinicas')
export class ClinicasController {
  constructor(private readonly clinicasService: ClinicasService) {}

  @Post('onboarding')
  @AllowWithoutTenant()
  onboard(@Body() dto: CreateClinicaDto, @Req() request: Request) {
    return this.clinicasService.onboard(dto, this.contextFromRequest(request));
  }

  private contextFromRequest(request: Request): OnboardingContext {
    const forwardedFor = request.headers['x-forwarded-for'];
    const ip = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0]?.trim() || request.ip || 'unknown';

    return {
      ip,
      userAgent: request.headers['user-agent'] ?? 'unknown',
    };
  }
}
