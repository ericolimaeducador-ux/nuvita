import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { StatusAgendamento } from '../../agendamentos/domain/agendamento.entity';
import { TipoAtendimento } from '../domain/prontuario.entity';
import { ProntuarioSchema } from '../infrastructure/mongo/prontuario.schema';
import { CreateProntuarioDto } from './dto/create-prontuario.dto';
import { ProntuariosService } from './prontuarios.service';

// O registro de psicoterapia GRAVA qual formulário foi usado (completo | seguimento); o servidor valida e o assina.
const ids = { clinicaId: '6addf106f1ed2961f5111e68', pacienteId: '6addf5f398eae6c5fd7e9d4f', agendamentoId: '6addf7a498eae6c5fd7e9dda' };
const opcoes = { whitelist: true, forbidNonWhitelisted: true };
const dto = (over: Record<string, unknown>) =>
  plainToInstance(CreateProntuarioDto, { ...ids, tipo: TipoAtendimento.PSICOTERAPIA, registroPsicologico: { anotacoesLivres: 'x' }, ...over });

describe('CreateProntuarioDto — formulario', () => {
  it.each(['completo', 'seguimento'])('%s é válido', async (formulario) => {
    expect(await validate(dto({ formulario }), opcoes)).toHaveLength(0);
  });
  it('ausente em registro de psicoterapia: recusado', async () => {
    expect((await validate(dto({}), opcoes)).length).toBeGreaterThan(0);
  });
  it('valor inválido: recusado', async () => {
    expect((await validate(dto({ formulario: 'qualquer' }), opcoes)).length).toBeGreaterThan(0);
  });
});

const context = {
  ip: '127.0.0.1',
  userAgent: 'jest',
  user: { sub: 'psi-1', email: 'p@x.test', papel: Papel.ENFERMEIRO, clinicaId: ids.clinicaId, jti: 'j', typ: 'access' as const },
};

describe('ProntuariosService — grava e assina o formulário usado', () => {
  it('create grava o formulario recebido', async () => {
    const create = jest.fn().mockImplementation((i) => Promise.resolve({ id: 'pr-1', ...i }));
    const service = new ProntuariosService(
      { create, findByAgendamento: jest.fn().mockResolvedValue(null) } as never,
      { autocomplete: jest.fn() } as never,
      { create: jest.fn().mockResolvedValue(undefined) } as never,
      { getConfig: () => ({ prontuarioSignatureSecret: 's' }) } as never,
      {
        obterParaEmissao: jest.fn().mockResolvedValue({
          pacienteId: ids.pacienteId,
          status: StatusAgendamento.AGENDADO,
          dataHoraInicio: new Date('2026-10-25T13:00:00Z'),
        }),
        conclude: jest.fn().mockResolvedValue(undefined),
      } as never,
      { findById: jest.fn() } as never,
    );
    await service.create(dto({ formulario: 'seguimento' }) as never, context);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ formulario: 'seguimento' }));
  });

  it('o formulario entra no hash da assinatura', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-26T12:00:00Z'));
    try {
      const hashDe = async (formulario: string) => {
        const base = {
          id: 'pr-1', clinicaId: ids.clinicaId, pacienteId: ids.pacienteId, medicoId: 'psi-1', agendamentoId: ids.agendamentoId,
          dataAtendimento: new Date('2026-10-25T13:00:00Z'), tipo: TipoAtendimento.PSICOTERAPIA, formulario,
          subjetivo: {}, objetivo: {}, avaliacao: {}, plano: {}, registroPsicologico: { anotacoesLivres: 'x' }, arquivos: [],
        };
        const sign = jest.fn().mockImplementation((_c, _i, input) => Promise.resolve({ ...base, assinado: input }));
        const service = new ProntuariosService(
          { findById: jest.fn().mockResolvedValue(base), sign } as never,
          { autocomplete: jest.fn() } as never,
          { create: jest.fn().mockResolvedValue(undefined) } as never,
          { getConfig: () => ({ prontuarioSignatureSecret: 's' }) } as never,
          { conclude: jest.fn() } as never,
          { findById: jest.fn().mockResolvedValue({ id: 'psi-1', coren: 'COREN 06/1' }) } as never,
        );
        await service.sign('pr-1', undefined, context);
        return sign.mock.calls[0][2].hash as string;
      };
      expect(await hashDe('completo')).not.toEqual(await hashDe('seguimento'));
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('Schema', () => {
  it('formulario é um campo do registro, restrito a completo | seguimento', () => {
    const campo = ProntuarioSchema.path('formulario') as unknown as { options: { enum?: string[] } };
    expect(campo).toBeDefined();
    expect(campo.options.enum).toEqual(['completo', 'seguimento']);
  });
});
