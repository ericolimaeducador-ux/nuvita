import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InscricaoTeste, InscricaoTesteStatus } from '../domain/inscricao-teste.entity';
import { INSCRICAO_TESTE_REPOSITORY, TERMO_TESTE_VERSAO_ATUAL, VAGAS_TESTE_BETA } from '../inscricoes-teste.constants';
import { CriarInscricaoTesteDto } from './dto/criar-inscricao-teste.dto';
import { InscricoesTesteMailer } from './inscricoes-teste.mailer';
import { InscricaoTesteRepository } from './ports/inscricao-teste.repository';

export interface InscricaoRequestMeta {
  ip: string;
  userAgent: string;
}

export interface InscricaoTesteListada extends Omit<InscricaoTeste, 'aceiteIp'> {
  /** Posição na ordem de inscrição, ignorando canceladas (1 = primeira). */
  posicao: number | null;
  /** Está entre as primeiras VAGAS_TESTE_BETA inscrições não canceladas. */
  dentroDasVagas: boolean;
}

@Injectable()
export class InscricoesTesteService {
  private readonly logger = new Logger(InscricoesTesteService.name);

  constructor(
    @Inject(INSCRICAO_TESTE_REPOSITORY) private readonly repo: InscricaoTesteRepository,
    private readonly mailer: InscricoesTesteMailer,
  ) {}

  /**
   * Resposta idêntica para inscrição nova, repetida ou descartada por robô: a rota é
   * pública e não pode revelar se um e-mail já está cadastrado.
   */
  async criar(dto: CriarInscricaoTesteDto, meta: InscricaoRequestMeta): Promise<{ recebida: true }> {
    if (dto.website) {
      this.logger.warn('Inscrição de teste descartada: campo-armadilha preenchido.');
      return { recebida: true };
    }

    if (dto.termoVersao !== TERMO_TESTE_VERSAO_ATUAL) {
      throw new BadRequestException('O termo de teste foi atualizado. Recarregue a página e aceite a versão atual.');
    }

    if (await this.repo.existePorEmail(dto.email)) {
      return { recebida: true };
    }

    const criada = await this.repo.criar({
      nome: dto.nome,
      email: dto.email,
      whatsapp: dto.whatsapp,
      crpNumero: dto.crpNumero,
      cidadeEstado: dto.cidadeEstado,
      modoAtendimento: dto.modoAtendimento,
      ferramentaAtual: dto.ferramentaAtual || undefined,
      maiorDor: dto.maiorDor || undefined,
      termoVersao: dto.termoVersao,
      aceiteTermoEm: new Date(),
      aceiteIp: meta.ip,
      aceiteUserAgent: meta.userAgent.slice(0, 300),
    });

    if (criada) {
      // Aguarda os e-mails (no Cloud Run a CPU pode ser reduzida após a resposta). O mailer
      // engole falhas: a inscrição já está salva e não pode ser perdida por erro de e-mail.
      await Promise.all([this.mailer.avisarEquipe(criada), this.mailer.confirmarRecebimento(criada)]);
    }

    return { recebida: true };
  }

  async listar(): Promise<InscricaoTesteListada[]> {
    const todas = await this.repo.listar();
    let posicao = 0;
    return todas.map(({ aceiteIp: _ip, ...resto }) => {
      const cancelada = resto.status === InscricaoTesteStatus.CANCELADA;
      if (!cancelada) posicao += 1;
      return {
        ...resto,
        posicao: cancelada ? null : posicao,
        dentroDasVagas: !cancelada && posicao <= VAGAS_TESTE_BETA,
      };
    });
  }

  async atualizarStatus(id: string, status: InscricaoTesteStatus): Promise<InscricaoTeste> {
    const atualizada = await this.repo.atualizarStatus(id, status);
    if (!atualizada) throw new NotFoundException('Inscrição não encontrada');
    return atualizada;
  }
}
