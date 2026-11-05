import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CriarClinicaDto } from '../../../super-admin/application/dto/criar-clinica.dto';
import { PreencherDocumentoDto } from './preencher-documento.dto';

const opcoes = { whitelist: true, forbidNonWhitelisted: true };
const erros = async (cls: new () => object, corpo: Record<string, unknown>) =>
  (await validate(plainToInstance(cls, corpo) as object, opcoes)).length;

describe('PreencherDocumentoDto', () => {
  it('CPF válido: ok', async () => expect(await erros(PreencherDocumentoDto, { tipoDocumento: 'CPF', documento: '529.982.247-25' })).toBe(0));
  it('CPF com dígito verificador errado: recusa', async () => expect(await erros(PreencherDocumentoDto, { tipoDocumento: 'CPF', documento: '555.444.333-12' })).toBeGreaterThan(0));
  it('sem documento ou sem tipo: recusa', async () => {
    expect(await erros(PreencherDocumentoDto, { tipoDocumento: 'CPF' })).toBeGreaterThan(0);
    expect(await erros(PreencherDocumentoDto, { documento: '529.982.247-25' })).toBeGreaterThan(0);
  });
});

describe('CriarClinicaDto (super-admin) sem documento', () => {
  const base = {
    clinica: { nome: 'Clínica da Claudia', plano: 'basico', faseTeste: true, fusoHorario: 'America/Sao_Paulo', duracaoConsultaPadrao: 50 },
    primeiroAdmin: { nome: 'Claudia', email: 'claudia@x.test' },
  };
  it('sem documento nem tipo: ok', async () => expect(await erros(CriarClinicaDto, base)).toBe(0));
  it('com documento válido e tipo: ok', async () =>
    expect(await erros(CriarClinicaDto, { ...base, clinica: { ...base.clinica, tipoDocumento: 'CPF', documento: '529.982.247-25' } })).toBe(0));
  it('documento sem tipo (ou o inverso): recusa', async () => {
    expect(await erros(CriarClinicaDto, { ...base, clinica: { ...base.clinica, documento: '529.982.247-25' } })).toBeGreaterThan(0);
    expect(await erros(CriarClinicaDto, { ...base, clinica: { ...base.clinica, tipoDocumento: 'CPF' } })).toBeGreaterThan(0);
  });
});
