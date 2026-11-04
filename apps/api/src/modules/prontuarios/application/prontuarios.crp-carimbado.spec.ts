import 'reflect-metadata';
import { UnprocessableEntityException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { TipoAtendimento } from '../domain/prontuario.entity';
import { ProntuarioSchema } from '../infrastructure/mongo/prontuario.schema';
import { CreateProntuarioDto } from './dto/create-prontuario.dto';
import { ProntuariosService } from './prontuarios.service';

// CRP carimbado pelo servidor: fonte única = user.crp do perfil. 422 sem CRP; o corpo do registro não carrega mais CRP.
const context = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: { sub: 'psi-1', email: 'psi@nuvita.test', papel: Papel.PSICOLOGO, clinicaId: 'cli-1', jti: 'j', typ: 'access' as const },
};

const rascunho = {
  id: 'pr-1', clinicaId: 'cli-1', pacienteId: 'pac-1', medicoId: 'psi-1', agendamentoId: 'ag-1',
  dataAtendimento: new Date('2026-10-25T13:00:00Z'), tipo: TipoAtendimento.PSICOTERAPIA,
  subjetivo: {}, objetivo: {}, avaliacao: {}, plano: {}, registroPsicologico: { anotacoesLivres: 'x' }, arquivos: [],
};

function montar(perfil: Record<string, unknown> | null) {
  const sign = jest.fn().mockImplementation((_c, _id, input) => Promise.resolve({ ...rascunho, assinado: input }));
  const users = { findById: jest.fn().mockResolvedValue(perfil) };
  const service = new ProntuariosService(
    { findById: jest.fn().mockResolvedValue(rascunho), sign } as never,
    { autocomplete: jest.fn() } as never,
    { create: jest.fn().mockResolvedValue(undefined) } as never,
    { getConfig: () => ({ prontuarioSignatureSecret: 'segredo-de-teste' }) } as never,
    { conclude: jest.fn() } as never,
    users as never,
  );
  return { service, sign, users };
}

describe('ProntuariosService.sign — CRP carimbado pelo servidor', () => {
  it('carimba o CRP do PERFIL na assinatura', async () => {
    const { service, sign, users } = montar({ id: 'psi-1', crp: 'CRP 06/12345' });
    await service.sign('pr-1', undefined, context);
    expect(users.findById).toHaveBeenCalledWith('psi-1');
    expect(sign).toHaveBeenCalledWith('cli-1', 'pr-1', expect.objectContaining({ medicoId: 'psi-1', crp: 'CRP 06/12345' }));
  });

  it('o CRP carimbado entra no hash da assinatura (CRP diferente = hash diferente)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-26T12:00:00Z'));
    try {
      const a = montar({ id: 'psi-1', crp: 'CRP 06/12345' });
      const b = montar({ id: 'psi-1', crp: 'CRP 06/99999' });
      await a.service.sign('pr-1', undefined, context);
      await b.service.sign('pr-1', undefined, context);
      expect(a.sign.mock.calls[0][2].hash).not.toEqual(b.sign.mock.calls[0][2].hash);
    } finally {
      jest.useRealTimers();
    }
  });

  it.each([
    ['perfil sem CRP', { id: 'psi-1' }],
    ['CRP vazio', { id: 'psi-1', crp: '' }],
    ['CRP só espaços', { id: 'psi-1', crp: '   ' }],
    ['perfil não encontrado', null],
  ])('%s: 422 e NADA é assinado', async (_nome, perfil) => {
    const { service, sign } = montar(perfil);
    await expect(service.sign('pr-1', undefined, context)).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(sign).not.toHaveBeenCalled();
  });
});

describe('Contrato do corpo do registro — sem CRP digitável', () => {
  const dto = (registroPsicologico: Record<string, unknown>) =>
    plainToInstance(CreateProntuarioDto, {
      clinicaId: '6addf106f1ed2961f5111e68', pacienteId: '6addf5f398eae6c5fd7e9d4f', agendamentoId: '6addf7a498eae6c5fd7e9dda', tipo: TipoAtendimento.PSICOTERAPIA, formulario: 'seguimento', registroPsicologico,
    });

  it('"crp" no corpo é RECUSADO pelo servidor (a tela não o envia mais)', async () => {
    const erros = await validate(dto({ anotacoesLivres: 'x', crp: '0152482' }), { whitelist: true, forbidNonWhitelisted: true });
    expect(JSON.stringify(erros)).toContain('crp');
    expect(erros.length).toBeGreaterThan(0);
  });

  it('o mesmo corpo sem "crp" é válido', async () => {
    const erros = await validate(dto({ anotacoesLivres: 'x' }), { whitelist: true, forbidNonWhitelisted: true });
    expect(erros).toHaveLength(0);
  });
});

describe('Schema da assinatura', () => {
  it('guarda o CRP carimbado em assinado.crp', () => {
    const assinado = ProntuarioSchema.path('assinado') as unknown as { schema: { path: (n: string) => unknown } };
    expect(assinado.schema.path('crp')).toBeDefined();
  });
});
