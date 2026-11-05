import 'reflect-metadata';
import { UnprocessableEntityException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { TipoAtendimento } from '../domain/prontuario.entity';
import { ProntuarioSchema } from '../infrastructure/mongo/prontuario.schema';
import { CreateProntuarioDto } from './dto/create-prontuario.dto';
import { ProntuariosService } from './prontuarios.service';

// COREN carimbado pelo servidor: fonte única = user.coren do perfil. 422 sem COREN; o corpo do registro não carrega mais COREN.
const context = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: { sub: 'psi-1', email: 'psi@nuvita.test', papel: Papel.ENFERMEIRO, clinicaId: 'cli-1', jti: 'j', typ: 'access' as const },
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

describe('ProntuariosService.sign — COREN carimbado pelo servidor', () => {
  it('carimba o COREN do PERFIL na assinatura', async () => {
    const { service, sign, users } = montar({ id: 'psi-1', coren: 'COREN 06/12345' });
    await service.sign('pr-1', undefined, context);
    expect(users.findById).toHaveBeenCalledWith('psi-1');
    expect(sign).toHaveBeenCalledWith('cli-1', 'pr-1', expect.objectContaining({ medicoId: 'psi-1', coren: 'COREN 06/12345' }));
  });

  it('o COREN carimbado entra no hash da assinatura (COREN diferente = hash diferente)', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-26T12:00:00Z'));
    try {
      const a = montar({ id: 'psi-1', coren: 'COREN 06/12345' });
      const b = montar({ id: 'psi-1', coren: 'COREN 06/99999' });
      await a.service.sign('pr-1', undefined, context);
      await b.service.sign('pr-1', undefined, context);
      expect(a.sign.mock.calls[0][2].hash).not.toEqual(b.sign.mock.calls[0][2].hash);
    } finally {
      jest.useRealTimers();
    }
  });

  it.each([
    ['perfil sem COREN', { id: 'psi-1' }],
    ['COREN vazio', { id: 'psi-1', coren: '' }],
    ['COREN só espaços', { id: 'psi-1', coren: '   ' }],
    ['perfil não encontrado', null],
  ])('%s: 422 e NADA é assinado', async (_nome, perfil) => {
    const { service, sign } = montar(perfil);
    await expect(service.sign('pr-1', undefined, context)).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(sign).not.toHaveBeenCalled();
  });
});

describe('Contrato do corpo do registro — sem COREN digitável', () => {
  const dto = (registroPsicologico: Record<string, unknown>) =>
    plainToInstance(CreateProntuarioDto, {
      clinicaId: '6addf106f1ed2961f5111e68', pacienteId: '6addf5f398eae6c5fd7e9d4f', agendamentoId: '6addf7a498eae6c5fd7e9dda', tipo: TipoAtendimento.PSICOTERAPIA, formulario: 'seguimento', registroPsicologico,
    });

  it('"coren" no corpo é RECUSADO pelo servidor (a tela não o envia mais)', async () => {
    const erros = await validate(dto({ anotacoesLivres: 'x', coren: '0152482' }), { whitelist: true, forbidNonWhitelisted: true });
    expect(JSON.stringify(erros)).toContain('coren');
    expect(erros.length).toBeGreaterThan(0);
  });

  it('o mesmo corpo sem "coren" é válido', async () => {
    const erros = await validate(dto({ anotacoesLivres: 'x' }), { whitelist: true, forbidNonWhitelisted: true });
    expect(erros).toHaveLength(0);
  });
});

describe('Schema da assinatura', () => {
  it('guarda o COREN carimbado em assinado.coren', () => {
    const assinado = ProntuarioSchema.path('assinado') as unknown as { schema: { path: (n: string) => unknown } };
    expect(assinado.schema.path('coren')).toBeDefined();
  });
});
