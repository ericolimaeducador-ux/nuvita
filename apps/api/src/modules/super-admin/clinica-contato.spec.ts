import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { Papel } from '../../../../../packages/shared/src/auth';
import { ClinicaMongoRepository } from '../clinicas/infrastructure/mongo/clinica-mongo.repository';
import { ConfiguracoesClinicaDto } from '../clinicas/application/dto/create-clinica.dto';
import { TipoDocumentoFiscal } from '../../../../../packages/shared/src/documentos';
import { PlanoClinica } from '../clinicas/domain/clinica.entity';
import { CriarClinicaDto } from './application/dto/criar-clinica.dto';
import { UpdateClinicaDto } from './application/dto/update-clinica.dto';
import { SuperAdminService } from './super-admin.service';

jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hash-bcrypt') }));

/**
 * Clínica com telefone e emailContato (em configuracoes) — feature-timbre-clinico-dinamico, PR 1.
 * Os DTOs usam a ValidationPipe real da app (whitelist + forbidNonWhitelisted): campo
 * desconhecido hoje é REJEITADO, então `telefone`/`emailContato` precisam existir nos DTOs.
 */
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const body = (metatype: new () => unknown) => ({ type: 'body' as const, metatype });

const clinicaInput = {
  nome: 'Clínica Nova',
  tipoDocumento: TipoDocumentoFiscal.CNPJ,
  documento: '11222333000181',
  plano: PlanoClinica.BASICO,
  fusoHorario: 'America/Sao_Paulo',
  duracaoConsultaPadrao: 50,
};

describe('Clínica: telefone e emailContato aceitos pelo SUPER_ADMIN (RED 6)', () => {
  it('CriarClinicaDto aceita telefone e emailContato', async () => {
    const payload = {
      clinica: { ...clinicaInput, telefone: '(11) 4000-1234', emailContato: 'contato@clinica.test' },
      primeiroAdmin: { nome: 'Admin', email: 'admin@clinica.test' },
    };

    const r = (await pipe.transform(payload, body(CriarClinicaDto))) as CriarClinicaDto;

    expect(r.clinica).toMatchObject({ telefone: '(11) 4000-1234', emailContato: 'contato@clinica.test' });
  });

  it('CriarClinicaDto valida o formato: e-mail de contato válido passa e inválido é rejeitado', async () => {
    const com = (emailContato: string) => ({
      clinica: { ...clinicaInput, emailContato },
      primeiroAdmin: { nome: 'Admin', email: 'admin@clinica.test' },
    });
    // o "válido passa" é o que deixa este teste vermelho hoje (sem ele, qualquer campo novo seria "rejeitado")
    await expect(pipe.transform(com('contato@clinica.test'), body(CriarClinicaDto))).resolves.toBeDefined();
    await expect(pipe.transform(com('nao-e-email'), body(CriarClinicaDto))).rejects.toBeInstanceOf(BadRequestException);
  });

  it('UpdateClinicaDto (PATCH /super-admin/clinicas/:id) aceita telefone e emailContato', async () => {
    const r = (await pipe.transform(
      { telefone: '(11) 4000-1234', emailContato: 'contato@clinica.test' },
      body(UpdateClinicaDto),
    )) as UpdateClinicaDto;

    expect(r).toMatchObject({ telefone: '(11) 4000-1234', emailContato: 'contato@clinica.test' });
  });

  it('ConfiguracoesClinicaDto (create da CLI/onboarding) aceita telefone e emailContato', async () => {
    const r = await pipe.transform(
      { fusoHorario: 'America/Sao_Paulo', duracaoConsultaPadrao: 50, telefone: '(11) 4000-1234', emailContato: 'c@clinica.test' },
      body(ConfiguracoesClinicaDto),
    );
    expect(r).toMatchObject({ telefone: '(11) 4000-1234', emailContato: 'c@clinica.test' });
  });

  it('criarClinica repassa telefone e emailContato dentro de configuracoes ao onboarding', async () => {
    const onboard = jest.fn().mockResolvedValue({
      clinica: { id: 'cli-1' },
      admin: { id: 'adm-1', papel: Papel.ADMIN },
      limites: {},
    });
    const service = new SuperAdminService({} as never, {} as never, {} as never, { onboard } as never);

    await service.criarClinica(
      {
        clinica: { ...clinicaInput, telefone: '(11) 4000-1234', emailContato: 'contato@clinica.test' },
        primeiroAdmin: { nome: 'Admin', email: 'admin@clinica.test' },
      } as never,
      { ip: '127.0.0.1', userAgent: 'jest', userId: 'super-1' },
    );

    expect(onboard.mock.calls[0][0].configuracoes).toMatchObject({
      telefone: '(11) 4000-1234',
      emailContato: 'contato@clinica.test',
    });
  });

  it('repositório Mongo grava telefone/emailContato em configuracoes sem sobrescrever o resto', async () => {
    const doc = {
      toObject: () => ({
        _id: { toString: () => 'cli-1' },
        nome: 'Clínica',
        documento: '11222333000181',
        tipoDocumento: TipoDocumentoFiscal.CNPJ,
        plano: PlanoClinica.BASICO,
        configuracoes: {},
        ativo: true,
        criadoEm: new Date(),
      }),
    };
    const findByIdAndUpdate = jest.fn().mockReturnValue({ exec: async () => doc });
    const repo = new ClinicaMongoRepository({ findByIdAndUpdate } as never);

    await repo.update('cli-1', { telefone: '(11) 4000-1234', emailContato: 'contato@clinica.test' } as never);

    const [, update] = findByIdAndUpdate.mock.calls[0];
    expect(update.$set).toMatchObject({
      'configuracoes.telefone': '(11) 4000-1234',
      'configuracoes.emailContato': 'contato@clinica.test',
    });
    expect(update.$set.configuracoes).toBeUndefined(); // dotted path: não troca o objeto inteiro
  });
});
