import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateClinicaDto } from '../../../super-admin/application/dto/update-clinica.dto';
import { CreateClinicaDto } from './create-clinica.dto';
import { PreencherDocumentoDto } from './preencher-documento.dto';

// Escopo do documento opcional: só a criação pelo super-admin (CriarClinicaDto, coberto em documento-primeiro-uso.dto.spec.ts).
// Os demais DTOs que usam DocumentoFiscalConstraint seguem exigindo/validando o documento.
const erros = async (cls: new () => object, corpo: Record<string, unknown>) =>
  (await validate(plainToInstance(cls, corpo) as object, { whitelist: true, forbidNonWhitelisted: true })).length;

describe('CreateClinicaDto (criação pelo ADMIN/CLI) continua exigindo documento', () => {
  const base = {
    nome: 'Clínica Teste', plano: 'basico',
    configuracoes: { fusoHorario: 'America/Sao_Paulo', duracaoConsultaPadrao: 50 },
    primeiroAdmin: { nome: 'Admin', email: 'admin@clinica.test', password: 'senhaGerada123' },
  };
  it('sem documento nem tipo: recusa', async () => expect(await erros(CreateClinicaDto, base)).toBeGreaterThan(0));
  it('só o tipo, sem documento: recusa', async () => expect(await erros(CreateClinicaDto, { ...base, tipoDocumento: 'CPF' })).toBeGreaterThan(0));
  it('com tipo e documento válidos: ok', async () =>
    expect(await erros(CreateClinicaDto, { ...base, tipoDocumento: 'CPF', documento: '529.982.247-25' })).toBe(0));
});

describe('UpdateClinicaDto (super-admin) não regrava o sentinela nem limpa o documento', () => {
  it('documento vazio: recusa (não limpa)', async () =>
    expect(await erros(UpdateClinicaDto, { tipoDocumento: 'CPF', documento: '' })).toBeGreaterThan(0));
  it('o sentinela SEM-DOCUMENTO-<id> como documento: recusa', async () =>
    expect(await erros(UpdateClinicaDto, { tipoDocumento: 'CNPJ', documento: 'SEM-DOCUMENTO-3f2b6c1e-0000-4000-8000-000000000001' })).toBeGreaterThan(0));
  it('documento sem tipo (ou o inverso): recusa', async () => {
    expect(await erros(UpdateClinicaDto, { documento: '529.982.247-25' })).toBeGreaterThan(0);
    expect(await erros(UpdateClinicaDto, { tipoDocumento: 'CPF' })).toBeGreaterThan(0);
  });
  it('editar só o nome (sem mexer no documento): ok', async () => expect(await erros(UpdateClinicaDto, { nome: 'Novo' })).toBe(0));
  it('corrigir para um documento válido: ok', async () =>
    expect(await erros(UpdateClinicaDto, { tipoDocumento: 'CPF', documento: '529.982.247-25' })).toBe(0));
});

describe('PreencherDocumentoDto (psicóloga, primeiro uso) não aceita o sentinela', () => {
  it('o sentinela como documento: recusa', async () =>
    expect(await erros(PreencherDocumentoDto, { tipoDocumento: 'CNPJ', documento: 'SEM-DOCUMENTO-3f2b6c1e-0000-4000-8000-000000000001' })).toBeGreaterThan(0));
  it('documento vazio: recusa', async () =>
    expect(await erros(PreencherDocumentoDto, { tipoDocumento: 'CPF', documento: '' })).toBeGreaterThan(0));
  it('não aceita campo de clínica no corpo (o tenant vem só do token)', async () =>
    expect(await erros(PreencherDocumentoDto, { tipoDocumento: 'CPF', documento: '529.982.247-25', clinicaId: 'outra' })).toBeGreaterThan(0));
});
