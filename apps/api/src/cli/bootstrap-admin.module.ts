import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ClinicasModule } from '../modules/clinicas';
import { BootstrapAdminCommand } from './bootstrap-admin.command';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    ClinicasModule,
  ],
  providers: [BootstrapAdminCommand],
})
export class BootstrapAdminModule {}
