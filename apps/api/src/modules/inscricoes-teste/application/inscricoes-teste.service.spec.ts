import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InscricaoTeste, InscricaoTesteStatus } from '../domain/inscricao-teste.entity';
import { TERMO_TESTE_VERSAO_ATUAL, VAGAS_TESTE_BETA } from '../inscricoes-teste.constants';
import { CriarInscricaoTesteDto } from './dto/criar-inscricao-teste.dto';
import { InscricoesTesteMailer } from './inscricoes-teste.mailer';
import { InscricoesTesteService } from './inscricoes-teste.service';
import { InscricaoTesteRepository } from './ports/inscricao-teste.repository';

const meta = { ip: '1.2.3.4', userAgent: 'jest' };

const dto = (extra: Partial<CriarInscricaoTesteDto> = {}): CriarInscricaoTesteDto => ({
  nome: 'Ana Souza',
  email: 'ana@exemplo.com',
  whatsapp: '(11) 99999-8888',
  crpNumero: '06/12345',
  cidadeEstado: 'São Paulo, SP',
  modoAtendimento: 'Online',
  termoVersao: TERMO_TESTE_VERSAO_ATUAL,
  aceiteTermo: true,
  aceitePrivacidade: true,
  ...extra,
});

const inscricao = (n: number, status = InscricaoTesteStatus.INSCRITA): InscricaoTeste => ({
  id: `id-${n}`,
  nome: `Psi ${n}`,
  email: `psi${n}@exemplo.com`,
  whatsapp: '11999998888',
  crpNumero: '06/1',
  cidadeEstado: 'SP',
  modoAtendimento: 'Online',
  termoVersao: TERMO_TESTE_VERSAO_ATUAL,
  aceiteTermoEm: new Date('2026-10-20T12:00:00Z'),
  aceiteIp: '1.2.3.4',
  status,
  criadoEm: new Date(2026, 9, 20, 12, n),
});

function criarServico(repoParcial: Partial<jest.Mocked<InscricaoTesteRepository>> = {}) {
  const repo: jest.Mocked<InscricaoTesteRepository> = {
    existePorEmail: jest.fn().mockResolvedValue(false),
    criar: jest.fn().mockImplementation(async (i) => ({ ...inscricao(1), ...i, id: 'novo', status: InscricaoTesteStatus.INSCRITA })),
    listar: jest.fn().mockResolvedValue([]),
    atualizarStatus: jest.fn(),
    ...repoParcial,
  };
  const mailer = { avisarEquipe: jest.fn().mockResolvedValue(undefined), confirmarRecebimento: jest.fn().mockResolvedValue(undefined) };
  const service = new InscricoesTesteService(repo, mailer as unknown as InscricoesTesteMailer);
  return { service, repo, mailer };
}

describe('InscricoesTesteService', () => {
  it('inscrição nova: grava com prova do aceite e manda os dois e-mails', async () => {
    const { service, repo, mailer } = criarServico();
    await expect(service.criar(dto(), meta)).resolves.toEqual({ recebida: true });
    expect(repo.criar).toHaveBeenCalledWith(expect.objectContaining({ email: 'ana@exemplo.com', termoVersao: TERMO_TESTE_VERSAO_ATUAL, aceiteIp: '1.2.3.4' }));
    expect(mailer.avisarEquipe).toHaveBeenCalledTimes(1);
    expect(mailer.confirmarRecebimento).toHaveBeenCalledTimes(1);
  });

  it('campo-armadilha preenchido: responde igual, não grava e não envia e-mail', async () => {
    const { service, repo, mailer } = criarServico();
    await expect(service.criar(dto({ website: 'http://spam' }), meta)).resolves.toEqual({ recebida: true });
    expect(repo.criar).not.toHaveBeenCalled();
    expect(mailer.avisarEquipe).not.toHaveBeenCalled();
  });

  it('termo de versão antiga: rejeita e não grava', async () => {
    const { service, repo } = criarServico();
    await expect(service.criar(dto({ termoVersao: 'antigo' }), meta)).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.criar).not.toHaveBeenCalled();
  });

  it('e-mail já inscrito: resposta idêntica (não revela cadastro) e sem novo e-mail', async () => {
    const { service, repo, mailer } = criarServico({ existePorEmail: jest.fn().mockResolvedValue(true) });
    await expect(service.criar(dto(), meta)).resolves.toEqual({ recebida: true });
    expect(repo.criar).not.toHaveBeenCalled();
    expect(mailer.confirmarRecebimento).not.toHaveBeenCalled();
  });

  it('corrida no índice único (criar devolve null): resposta idêntica, sem e-mail', async () => {
    const { service, mailer } = criarServico({ criar: jest.fn().mockResolvedValue(null) });
    await expect(service.criar(dto(), meta)).resolves.toEqual({ recebida: true });
    expect(mailer.avisarEquipe).not.toHaveBeenCalled();
  });

  it('listar: posição por ordem de inscrição, canceladas fora da conta, corte nas vagas, sem IP', async () => {
    const todas = Array.from({ length: VAGAS_TESTE_BETA + 2 }, (_, i) => inscricao(i + 1));
    todas[1] = inscricao(2, InscricaoTesteStatus.CANCELADA);
    const { service } = criarServico({ listar: jest.fn().mockResolvedValue(todas) });
    const lista = await service.listar();
    expect(lista[0]).toEqual(expect.objectContaining({ posicao: 1, dentroDasVagas: true }));
    expect(lista[1]).toEqual(expect.objectContaining({ posicao: null, dentroDasVagas: false }));
    expect(lista[2]).toEqual(expect.objectContaining({ posicao: 2 }));
    // 27 inscrições, 1 cancelada => 26 válidas; a 26ª fica fora das 25 vagas
    expect(lista[lista.length - 1]).toEqual(expect.objectContaining({ posicao: 26, dentroDasVagas: false }));
    expect(lista.filter((i) => i.dentroDasVagas)).toHaveLength(VAGAS_TESTE_BETA);
    expect(lista[0]).not.toHaveProperty('aceiteIp');
  });

  it('atualizarStatus: inexistente → 404', async () => {
    const { service } = criarServico({ atualizarStatus: jest.fn().mockResolvedValue(null) });
    await expect(service.atualizarStatus('x', InscricaoTesteStatus.CONFIRMADA)).rejects.toBeInstanceOf(NotFoundException);
  });
});
