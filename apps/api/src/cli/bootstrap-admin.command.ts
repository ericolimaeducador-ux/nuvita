import { Injectable } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { AppConfigService } from '../common/security/config.service';
import { PlanoClinica } from '../modules/clinicas/domain/clinica.entity';
import { ClinicasService } from '../modules/clinicas/application/clinicas.service';

interface BootstrapAdminOptions {
  secret?: string;
  nome?: string;
  cnpj?: string;
  plano?: PlanoClinica;
  adminNome?: string;
  adminEmail?: string;
  adminPassword?: string;
  fusoHorario?: string;
  duracaoConsultaPadrao?: number;
}

@Injectable()
@Command({
  name: 'bootstrap-admin',
  description: 'Cria a primeira clinica e o primeiro ADMIN via CLI protegida por BOOTSTRAP_SECRET.',
})
export class BootstrapAdminCommand extends CommandRunner {
  constructor(
    private readonly clinicasService: ClinicasService,
    private readonly configService: AppConfigService,
  ) {
    super();
  }

  async run(_inputs: string[], options: BootstrapAdminOptions): Promise<void> {
    this.assertBootstrapSecret(options.secret);
    this.assertRequiredOptions(options);

    const result = await this.clinicasService.onboard(
      {
        nome: options.nome!,
        cnpj: options.cnpj!,
        plano: options.plano!,
        configuracoes: {
          fusoHorario: options.fusoHorario!,
          duracaoConsultaPadrao: options.duracaoConsultaPadrao!,
        },
        primeiroAdmin: {
          nome: options.adminNome!,
          email: options.adminEmail!,
          password: options.adminPassword!,
        },
      },
      {
        ip: 'cli',
        userAgent: 'bootstrap-admin-cli',
      },
    );

    process.stdout.write(
      `${JSON.stringify(
        {
          clinica: result.clinica,
          admin: result.admin,
          limites: result.limites,
          twoFactorSetup: result.twoFactorSetup,
        },
        null,
        2,
      )}\n`,
    );
  }

  @Option({ flags: '--secret <secret>', description: 'Valor que deve bater com BOOTSTRAP_SECRET.' })
  parseSecret(value: string): string {
    return value;
  }

  @Option({ flags: '--nome <nome>', description: 'Nome da clinica.' })
  parseNome(value: string): string {
    return value;
  }

  @Option({ flags: '--cnpj <cnpj>', description: 'CNPJ da clinica.' })
  parseCnpj(value: string): string {
    return value;
  }

  @Option({ flags: '--plano <plano>', description: 'Plano: basico, profissional ou enterprise.' })
  parsePlano(value: string): PlanoClinica {
    if (!Object.values(PlanoClinica).includes(value as PlanoClinica)) {
      throw new Error('Plano invalido.');
    }

    return value as PlanoClinica;
  }

  @Option({ flags: '--admin-nome <nome>', description: 'Nome do primeiro ADMIN.' })
  parseAdminNome(value: string): string {
    return value;
  }

  @Option({ flags: '--admin-email <email>', description: 'Email do primeiro ADMIN.' })
  parseAdminEmail(value: string): string {
    return value;
  }

  @Option({ flags: '--admin-password <password>', description: 'Senha inicial do primeiro ADMIN.' })
  parseAdminPassword(value: string): string {
    return value;
  }

  @Option({ flags: '--fuso-horario <timezone>', description: 'Timezone IANA da clinica.' })
  parseFusoHorario(value: string): string {
    return value;
  }

  @Option({ flags: '--duracao-consulta-padrao <minutos>', description: 'Duracao padrao em minutos.' })
  parseDuracaoConsultaPadrao(value: string): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 5) {
      throw new Error('Duracao padrao deve ser um inteiro >= 5.');
    }

    return parsed;
  }

  private assertBootstrapSecret(providedSecret: string | undefined): void {
    const expectedSecret = this.configService.getConfig().bootstrapSecret;
    const secret = providedSecret ?? process.env.BOOTSTRAP_SECRET_INPUT;

    if (!expectedSecret || !secret || secret !== expectedSecret) {
      throw new Error('BOOTSTRAP_SECRET ausente ou invalido.');
    }
  }

  private assertRequiredOptions(options: BootstrapAdminOptions): void {
    const missing = [
      ['--nome', options.nome],
      ['--cnpj', options.cnpj],
      ['--plano', options.plano],
      ['--admin-nome', options.adminNome],
      ['--admin-email', options.adminEmail],
      ['--admin-password', options.adminPassword],
      ['--fuso-horario', options.fusoHorario],
      ['--duracao-consulta-padrao', options.duracaoConsultaPadrao],
    ]
      .filter(([, value]) => value === undefined || value === '')
      .map(([flag]) => flag);

    if (missing.length) {
      throw new Error(`Opcoes obrigatorias ausentes: ${missing.join(', ')}.`);
    }
  }
}
