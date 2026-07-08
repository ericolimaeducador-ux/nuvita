import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { SecurityModule } from '../../common/security/security.module';
import { CLINICA_REPOSITORY } from '../clinicas/clinicas.constants';
import { ClinicaMongoRepository } from '../clinicas/infrastructure/mongo/clinica-mongo.repository';
import { ClinicaMongo, ClinicaSchema } from '../clinicas/infrastructure/mongo/clinica.schema';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';

@Module({
  imports: [
    AuthModule,
    SecurityModule,
    MongooseModule.forFeature([{ name: ClinicaMongo.name, schema: ClinicaSchema }]),
  ],
  controllers: [SuperAdminController],
  providers: [
    SuperAdminService,
    { provide: CLINICA_REPOSITORY, useClass: ClinicaMongoRepository },
  ],
})
export class SuperAdminModule {}
