import { UnprocessableEntityException } from '@nestjs/common';
import { Papel } from '../../../../../../packages/shared/src/auth';
import { TipoDocumentoFiscal } from '../../../../../../packages/shared/src/documentos';
import { SuperAdminService } from '../../super-admin/super-admin.service';
import { ClinicaMongoRepository } from '../infrastructure/mongo/clinica-mongo.repository';
import { ClinicasService } from './clinicas.service';

// Condição (a) do sentinela: cada leitor do documento, ligado ao repositório REAL (modelo simulado com o sentinela gravado),
// devolve vazio e nunca o valor com prefixo: GET /clinicas/minha, contexto de emissão, bloqueio de emissão,
// lista e edição do super-admin e a auditoria.
const SENTINELA = 'SEM-DOCUMENTO-3f2b6c1e-0000-4000-8000-000000000001';
const objectId = '6addf7a498eae6c5fd7e9dda';
const doc = () => ({
  toObject: () => ({
    _id: { toString: () => objectId }, nome: 'Clínica da Claudia', cnpj: SENTINELA, plano: 'basico', ativo: true, criadoEm: new Date(),
    configuracoes: { fusoHorario: 'America/Sao_Paulo', duracaoConsultaPadrao: 50 },
  }),
});
const exec = (v: unknown) => ({ exec: jest.fn().mockResolvedValue(v) });
const semPrefixo = (v: unknown) => expect(JSON.stringify(v)).not.toContain('SEM-DOCUMENTO');

function montar() {
  const model = {
    findById: jest.fn().mockReturnValue(exec(doc())),
    find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue(exec([doc()])) }),
    findByIdAndUpdate: jest.fn().mockReturnValue(exec(doc())),
    findOne: jest.fn().mockReturnValue(exec(null)),
  };
  const repo = new ClinicaMongoRepository(model as never);
  const auditLogs = { create: jest.fn().mockResolvedValue(undefined) };
  const storage = { getSignedReadUrl: jest.fn() };
  const config = { getConfig: jest.fn().mockReturnValue({}) };
  const clinicasService = new ClinicasService(repo as never, {} as never, auditLogs as never, config as never, storage as never);
  const users = { count: jest.fn().mockResolvedValue(1), definirFaseTesteDaClinica: jest.fn().mockResolvedValue(undefined) };
  const admin = new SuperAdminService(users as never, repo as never, config as never, clinicasService);
  return { model, repo, auditLogs, clinicasService, users, admin };
}
const usuario = { sub: 'psi-1', email: 'p@x.test', papel: Papel.ENFERMEIRO, clinicaId: objectId, jti: 'j', typ: 'access' as const };

describe('leitores do documento da clínica com o sentinela gravado', () => {
  it('GET /clinicas/minha (obterMinha): documento vazio', async () => {
    const { clinicasService } = montar();
    const minha = await clinicasService.obterMinha(usuario as never);
    expect(minha.documento).toBe('');
    semPrefixo(minha);
  });

  it('contextoDeEmissao: não carrega o documento nem o prefixo', async () => {
    const { clinicasService } = montar();
    semPrefixo(await clinicasService.contextoDeEmissao(objectId));
  });

  it('assertDocumentoInformado: 422 (pendente), sem prefixo na mensagem', async () => {
    const { clinicasService } = montar();
    const erro = await clinicasService.assertDocumentoInformado(objectId).catch((e) => e);
    expect(erro).toBeInstanceOf(UnprocessableEntityException);
    semPrefixo(erro.message);
  });

  it('lista de clínicas do super-admin: documento vazio', async () => {
    const { admin } = montar();
    const lista = await admin.listClinicas();
    expect(lista.items[0].documento).toBe('');
    semPrefixo(lista);
  });

  it('edição pelo super-admin (detalhe devolvido): documento vazio', async () => {
    const { admin } = montar();
    const atualizada = await admin.updateClinica(objectId, { nome: 'Novo nome' } as never);
    expect(atualizada.documento).toBe('');
    semPrefixo(atualizada);
  });

  it('auditoria da correção do documento: o "antes" é vazio, nunca o prefixo', async () => {
    const { admin, auditLogs } = montar();
    await admin.updateClinica(
      objectId,
      { tipoDocumento: TipoDocumentoFiscal.CPF, documento: '529.982.247-25' } as never,
      { ip: '1', userAgent: 'j', userId: 'sa-1' },
    );
    const chamadas = auditLogs.create.mock.calls.map((c) => c[0]);
    expect(chamadas.length).toBeGreaterThan(0);
    semPrefixo(chamadas);
    expect(chamadas[0].metadata.antes.documento).toBe('');
  });

  it('compensação de uma edição que falhou NÃO troca o sentinela por string vazia', async () => {
    const { admin, users, model } = montar();
    users.definirFaseTesteDaClinica.mockRejectedValueOnce(new Error('falhou no meio'));
    await expect(
      admin.updateClinica(objectId, { tipoDocumento: TipoDocumentoFiscal.CPF, documento: '529.982.247-25', faseTeste: true } as never),
    ).rejects.toThrow('falhou no meio');
    const restauracao = model.findByIdAndUpdate.mock.calls.at(-1)?.[1];
    expect(restauracao.$set.cnpj).toMatch(/^SEM-DOCUMENTO-/);
  });
});
