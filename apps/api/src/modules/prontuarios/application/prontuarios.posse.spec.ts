import { ForbiddenException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AppConfigService } from '../../../common/security/config.service';
import { Prontuario, TipoAtendimento } from '../domain/prontuario.entity';
import { Cid10Repository, ProntuarioRepository } from './ports/prontuario.repository';
import { ProntuariosService } from './prontuarios.service';
import { AgendamentosService } from '../../agendamentos/application/agendamentos.service';

// Posse por recurso: enfermeiro só lê/adenda prontuário que é DELE (sigilo profissional).
describe('ProntuariosService – posse por recurso', () => {
  const assinado = { medicoId: 'medico-A', dataAssinatura: new Date('2026-01-02T12:00:00.000Z'), hash: 'h' };
  const doColega: Prontuario = {
    id: 'pront-A',
    clinicaId: 'clinica-1',
    pacienteId: 'paciente-1',
    medicoId: 'medico-A',
    dataAtendimento: new Date('2026-01-01T12:00:00.000Z'),
    tipo: TipoAtendimento.PSICOTERAPIA,
    subjetivo: {},
    objetivo: {},
    avaliacao: {},
    plano: {},
    arquivos: [],
    assinado,
    criadoEm: new Date('2026-01-01T12:00:00.000Z'),
    atualizadoEm: new Date('2026-01-01T12:00:00.000Z'),
  };
  const meu: Prontuario = { ...doColega, id: 'pront-B', medicoId: 'medico-B', assinado: { ...assinado, medicoId: 'medico-B' } };

  const ctxDe = (sub: string) => ({
    ip: '127.0.0.1',
    userAgent: 'jest',
    user: { sub, email: `${sub}@nuvita.test`, papel: Papel.ENFERMEIRO, clinicaId: 'clinica-1', jti: 'j', typ: 'access' as const },
  });
  const colegaB = ctxDe('medico-B');

  function criar() {
    const repo = {
      findById: jest.fn().mockResolvedValue(doColega),
      listByPaciente: jest.fn().mockResolvedValue([doColega, meu]),
      listAddendums: jest.fn().mockResolvedValue([]),
      addAddendum: jest.fn(),
    };
    const service = new ProntuariosService(
      repo as unknown as ProntuarioRepository,
      { autocomplete: jest.fn() } as unknown as Cid10Repository,
      { create: jest.fn() } as unknown as AuditLogRepository,
      { getConfig: () => ({ prontuarioSignatureSecret: 's' }) } as unknown as AppConfigService,
      { conclude: jest.fn() } as unknown as AgendamentosService,
      // Autorizado pelo usuário (2026-10-27): o serviço agora recebe o repositório de usuários (COREN do perfil ao assinar).
      { findById: jest.fn() } as never,
    );
    return { service, repo };
  }

  it('colega NÃO lê prontuário de outro enfermeiro (findOne)', async () => {
    const { service } = criar();
    await expect(service.findOne('pront-A', undefined, colegaB)).rejects.toThrow(ForbiddenException);
  });

  it('colega NÃO lista adendos de prontuário alheio', async () => {
    const { service, repo } = criar();
    await expect(service.listAddendums('pront-A', undefined, colegaB)).rejects.toThrow(ForbiddenException);
    expect(repo.listAddendums).not.toHaveBeenCalled();
  });

  it('colega NÃO cria adendo em prontuário assinado alheio', async () => {
    const { service, repo } = criar();
    await expect(service.createAddendum('pront-A', { texto: 'x' }, undefined, colegaB)).rejects.toThrow(ForbiddenException);
    expect(repo.addAddendum).not.toHaveBeenCalled();
  });

  it('listagem por paciente devolve só os prontuários do próprio enfermeiro', async () => {
    const { service } = criar();
    const lista = await service.listByPaciente({ pacienteId: 'paciente-1' }, colegaB);
    expect(lista.map((p) => p.id)).toEqual(['pront-B']);
  });

  it('o autor continua lendo e adendando o próprio prontuário', async () => {
    const { service, repo } = criar();
    repo.addAddendum.mockResolvedValue({ id: 'ad1' });
    const autor = ctxDe('medico-A');
    await expect(service.findOne('pront-A', undefined, autor)).resolves.toBeDefined();
    await expect(service.createAddendum('pront-A', { texto: 'x' }, undefined, autor)).resolves.toBeDefined();
  });
});
