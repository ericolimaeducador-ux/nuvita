/**
 * Google Secrets Module
 * 
 * Provides centralized secrets management with KMS encryption
 * for all application modules
 */

import { Module } from '@nestjs/common';
import { GoogleSecretsService } from './google-secrets.service';

@Module({
  providers: [GoogleSecretsService],
  exports: [GoogleSecretsService],
})
export class GoogleSecretsModule {}
