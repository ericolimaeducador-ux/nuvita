/**
 * Security module for Nuvita API.
 *
 * Exports:
 * - AppConfigService: application configuration loaded from either GCP Secret Manager or env files
 * - GoogleSecretsService: encrypted secrets access and KMS envelope encryption
 */

import { Global, Module } from '@nestjs/common';
import { GoogleSecretsModule } from './google-secrets.module';
import { GoogleSecretsService } from './google-secrets.service';
import { AppConfigService } from './config.service';

@Global()
@Module({
  imports: [GoogleSecretsModule],
  providers: [
    {
      provide: AppConfigService,
      useFactory: async (googleSecretsService: GoogleSecretsService) => {
        const appConfigService = new AppConfigService(googleSecretsService);
        await appConfigService.initialize();
        return appConfigService;
      },
      inject: [GoogleSecretsService],
    },
  ],
  exports: [AppConfigService, GoogleSecretsModule],
})
export class SecurityModule {}
