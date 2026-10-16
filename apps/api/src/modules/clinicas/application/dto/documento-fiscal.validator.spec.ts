import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  cnpjValido,
  cpfValido,
  formatarDocumentoFiscal,
  normalizarDocumentoFiscal,
  TipoDocumentoFiscal,
} from '../../../../../../../packages/shared/src/documentos';
import { CriarClinicaDto } from '../../../super-admin/application/dto/criar-clinica.dto';

describe('documento fiscal — regras puras (packages/shared)', () => {
  it('CPF: aceita válido com e sem pontuação; recusa dígito errado, repetido e tamanho errado', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('52998224725')).toBe(true);
    expect(cpfValido('529.982.247-24')).toBe(false);
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('5299822472')).toBe(false);
    expect(cpfValido('5299822472A')).toBe(false);
  });

  it('CNPJ numérico: aceita válido com e sem pontuação; recusa dígito errado e repetido', () => {
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
    expect(cnpjValido('11222333000181')).toBe(true);
    expect(cnpjValido('55.747.955/0001-07')).toBe(true); // CNPJ da 7Safe
    expect(cnpjValido('11222333000182')).toBe(false);
    expect(cnpjValido('00000000000000')).toBe(false);
  });

  it('CNPJ alfanumérico (Receita, desde jul/2026): exemplo oficial 12.ABC.345/01DE-35', () => {
    expect(cnpjValido('12.ABC.345/01DE-35')).toBe(true);
    expect(cnpjValido('12abc34501de35')).toBe(true); // minúsculas normalizam
    expect(cnpjValido('12ABC34501DE36')).toBe(false);
    expect(cnpjValido('12ABC34501DE3A')).toBe(false); // verificadores são sempre numéricos
  });

  it('CPF e CNPJ não se confundem', () => {
    expect(cnpjValido('52998224725')).toBe(false);
    expect(cpfValido('11222333000181')).toBe(false);
  });

  it('normaliza e formata', () => {
    expect(normalizarDocumentoFiscal(' 12.abc.345/01de-35 ')).toBe('12ABC34501DE35');
    expect(formatarDocumentoFiscal(TipoDocumentoFiscal.CPF, '52998224725')).toBe('529.982.247-25');
    expect(formatarDocumentoFiscal(TipoDocumentoFiscal.CNPJ, '12ABC34501DE35')).toBe('12.ABC.345/01DE-35');
  });
});

describe('CriarClinicaDto — validação do documento conforme o tipo', () => {
  const base = {
    clinica: {
      nome: 'Consultório Teste',
      plano: 'basico',
      fusoHorario: 'America/Sao_Paulo',
      duracaoConsultaPadrao: 50,
      faseTeste: false,
    },
    primeiroAdmin: { nome: 'Fulana', email: 'fulana@teste.com' },
  };
  const erros = async (clinicaExtra: Record<string, unknown>) => {
    const dto = plainToInstance(CriarClinicaDto, { ...base, clinica: { ...base.clinica, ...clinicaExtra } });
    const errs = await validate(dto);
    return errs.flatMap((e) => (e.children ?? []).flatMap((c) => Object.values(c.constraints ?? {})));
  };

  it('CPF válido passa', async () => {
    expect(await erros({ tipoDocumento: 'CPF', documento: '529.982.247-25' })).toEqual([]);
  });

  it('CNPJ alfanumérico válido passa', async () => {
    expect(await erros({ tipoDocumento: 'CNPJ', documento: '12.ABC.345/01DE-35' })).toEqual([]);
  });

  it('CPF informado como CNPJ é recusado com "CNPJ inválido."', async () => {
    expect(await erros({ tipoDocumento: 'CNPJ', documento: '52998224725' })).toContain('CNPJ inválido.');
  });

  it('CPF com dígito errado é recusado com "CPF inválido."', async () => {
    expect(await erros({ tipoDocumento: 'CPF', documento: '52998224724' })).toContain('CPF inválido.');
  });

  it('sem tipoDocumento é recusado', async () => {
    expect((await erros({ documento: '52998224725' })).length).toBeGreaterThan(0);
  });

  it('campo antigo "cnpj" não é mais aceito no lugar de documento', async () => {
    expect((await erros({ cnpj: '11222333000181' })).length).toBeGreaterThan(0);
  });
});

describe('sincronia com a cópia do web (apps/web/src/lib/documento-fiscal.ts)', () => {
  it('as regras do web são idênticas às de packages/shared', () => {
    const raiz = join(__dirname, '../../../../../../..');
    const corpo = (arquivo: string) => {
      const texto = readFileSync(join(raiz, arquivo), 'utf8');
      return texto.slice(texto.indexOf('export enum TipoDocumentoFiscal'));
    };
    expect(corpo('apps/web/src/lib/documento-fiscal.ts')).toBe(
      corpo('packages/shared/src/documentos/documento-fiscal.ts'),
    );
  });
});
