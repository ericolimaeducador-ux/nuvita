import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ClinicasModule } from '../modules/clinicas';
import { BootstrapAdminCommand } from './bootstrap-admin.command';
import { SecurityModule } from '../common/security/security.module';
import { AppConfigService } from '../common/security/config.service';
import { TenancyModule } from '../common/tenancy/tenancy.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SecurityModule,
    TenancyModule,
    MongooseModule.forRootAsync({
      imports: [SecurityModule],
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        uri: configService.getConfig().mongodbUri,
      }),
    }),
    ClinicasModule,
  ],
  providers: [BootstrapAdminCommand],
})
export class BootstrapAdminModule {}
