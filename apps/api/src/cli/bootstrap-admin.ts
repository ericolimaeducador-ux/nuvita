import { CommandFactory } from 'nest-commander';
import { BootstrapAdminModule } from './bootstrap-admin.module';

void CommandFactory.run(BootstrapAdminModule);
