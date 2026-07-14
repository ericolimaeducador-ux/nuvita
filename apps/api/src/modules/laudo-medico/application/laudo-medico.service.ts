import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { AuthTokenPayload, Papel } from '../../../../../../packages/shared/src/auth';
import { EtapaFluxoClinico } from '../../../../../../packages/shared/src/fluxo-clinico';
import {
  LAUDO_MEDICO_BOOLEAN_DEFAULTS,
  LAUDO_MEDICO_CATETER_EXTERNO_DEFAULTS,
  LAUDO_MEDICO_ESPECIALIDADE_DEFAULT,
} from '../../../../../../packages/shared/src/laudo-medico';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { LAUDO_MEDICO_REPOSITORY } from '../laudo-medico.constants';
import { LaudoMedico, StatusLaudoMedico } from '../domain/laudo-medico.entity';
import { LaudoMedicoRepository } from './ports/laudo-medico.repository';
import { CreateLaudoMedicoDto } from './dto/create-laudo-medico.dto';
import { UpdateLaudoMedicoDto } from './dto/update-laudo-medico.dto';

const PODE_REVISAR = [Papel.MEDICO, Papel.ADMIN];

@Injectable()
export class LaudoMedicoService {
  constructor(
    @Inject(LAUDO_MEDICO_REPOSITORY) private readonly repo: LaudoMedicoRepository,
    private readonly pacientesService: PacientesService,
  ) {}

  async create(dto: CreateLaudoMedicoDto, user: AuthTokenPayload): Promise<LaudoMedico> {
    const clinicaId = this.resolveClinicaId(user, dto.clinicaId);
    const D = LAUDO_MEDICO_BOOLEAN_DEFAULTS;
    return this.repo.create({
      clinicaId,
      pacienteId: dto.pacienteId,
      criadoPorId: user.sub,
      criadoPorNome: user.nome,
      criadoPorPapel: user.papel,
      status: StatusLaudoMedico.RASCUNHO,
      avaliacaoIuId: dto.avaliacaoIuId,
      dataLaudo: new Date(dto.dataLaudo),
      cid10: dto.cid10,

      contextoSocial: dto.contextoSocial,
      etiologia: dto.etiologia,
      nivelLesao: dto.nivelLesao,
      diagnosticoFuncional: dto.diagnosticoFuncional,
      regimeCil: dto.regimeCil,
      insumoAtual: dto.insumoAtual,
      fornecedorAtual: dto.fornecedorAtual,

      riscoEsvaziamento: dto.riscoEsvaziamento ?? D.riscoEsvaziamento,
      riscoItuAtual: dto.riscoItuAtual ?? D.riscoItuAtual,
      riscoAntibioticoterapia: dto.riscoAntibioticoterapia ?? D.riscoAntibioticoterapia,
      riscoTratoSuperior: dto.riscoTratoSuperior ?? D.riscoTratoSuperior,
      riscoInsuficienciaRenal: dto.riscoInsuficienciaRenal ?? D.riscoInsuficienciaRenal,
      riscoLesaoUretral: dto.riscoLesaoUretral ?? D.riscoLesaoUretral,
      riscoPerdasNoturnas: dto.riscoPerdasNoturnas ?? D.riscoPerdasNoturnas,

      deficienciaLubrificacao: dto.deficienciaLubrificacao ?? D.deficienciaLubrificacao,
      deficienciaPontaProtetora: dto.deficienciaPontaProtetora ?? D.deficienciaPontaProtetora,
      deficienciaMangaProtetora: dto.deficienciaMangaProtetora ?? D.deficienciaMangaProtetora,
      deficienciaDor: dto.deficienciaDor ?? D.deficienciaDor,
      deficienciaAlergiaLidocaina: dto.deficienciaAlergiaLidocaina ?? D.deficienciaAlergiaLidocaina,
      deficienciaFrascoReutilizado: dto.deficienciaFrascoReutilizado ?? D.deficienciaFrascoReutilizado,
      deficienciaRiscoInternacao: dto.deficienciaRiscoInternacao ?? D.deficienciaRiscoInternacao,

      prescricaoIncluirCodigoFabricante: dto.prescricaoIncluirCodigoFabricante ?? D.prescricaoIncluirCodigoFabricante,
      prescricaoEmbalagemPocket: dto.prescricaoEmbalagemPocket ?? D.prescricaoEmbalagemPocket,
      prescricaoClausulaMarca: dto.prescricaoClausulaMarca ?? D.prescricaoClausulaMarca,
      prescricaoCateterExterno: dto.prescricaoCateterExterno ?? D.prescricaoCateterExterno,
      prescricaoIncluirObjetivo: dto.prescricaoIncluirObjetivo ?? D.prescricaoIncluirObjetivo,
      prescricaoIncluirConclusao: dto.prescricaoIncluirConclusao ?? D.prescricaoIncluirConclusao,
      cateterExterno: (dto.prescricaoCateterExterno ?? D.prescricaoCateterExterno)
        ? {
            incluirDescricaoTecnica: dto.cateterExterno?.incluirDescricaoTecnica ?? LAUDO_MEDICO_CATETER_EXTERNO_DEFAULTS.incluirDescricaoTecnica,
            incluirCodigoSiafisico: dto.cateterExterno?.incluirCodigoSiafisico ?? LAUDO_MEDICO_CATETER_EXTERNO_DEFAULTS.incluirCodigoSiafisico,
          }
        : undefined,

      produtosSolicitados: dto.produtosSolicitados,
      comparativoAnvisa: dto.comparativoAnvisa,

      medicoNomeExibicao: dto.medicoNomeExibicao,
      medicoEspecialidade: dto.medicoEspecialidade ?? LAUDO_MEDICO_ESPECIALIDADE_DEFAULT,
      crmExibicao: dto.crmExibicao,
      cidadeEmissao: dto.cidadeEmissao,
    });
  }

  async update(id: string, dto: UpdateLaudoMedicoDto, clinicaId: string | undefined, user: AuthTokenPayload): Promise<LaudoMedico> {
    const resolved = this.resolveClinicaId(user, clinicaId);
    const laudo = await this.repo.findById(resolved, id);
    if (!laudo) throw new NotFoundException('Relatório médico não encontrado.');
    if (laudo.status === StatusLaudoMedico.ASSINADO) throw new ConflictException('Relatório já assinado não pode ser editado.');
    this.assertPodeEditar(laudo, user);

    const patch: Partial<LaudoMedico> = {};
    if (dto.dataLaudo !== undefined) patch.dataLaudo = new Date(dto.dataLaudo);
    if (dto.cid10 !== undefined) patch.cid10 = dto.cid10;

    if (dto.contextoSocial !== undefined) patch.contextoSocial = dto.contextoSocial;
    if (dto.etiologia !== undefined) patch.etiologia = dto.etiologia;
    if (dto.nivelLesao !== undefined) patch.nivelLesao = dto.nivelLesao;
    if (dto.diagnosticoFuncional !== undefined) patch.diagnosticoFuncional = dto.diagnosticoFuncional;
    if (dto.regimeCil !== undefined) patch.regimeCil = dto.regimeCil;
    if (dto.insumoAtual !== undefined) patch.insumoAtual = dto.insumoAtual;
    if (dto.fornecedorAtual !== undefined) patch.fornecedorAtual = dto.fornecedorAtual;

    if (dto.riscoEsvaziamento !== undefined) patch.riscoEsvaziamento = dto.riscoEsvaziamento;
    if (dto.riscoItuAtual !== undefined) patch.riscoItuAtual = dto.riscoItuAtual;
    if (dto.riscoAntibioticoterapia !== undefined) patch.riscoAntibioticoterapia = dto.riscoAntibioticoterapia;
    if (dto.riscoTratoSuperior !== undefined) patch.riscoTratoSuperior = dto.riscoTratoSuperior;
    if (dto.riscoInsuficienciaRenal !== undefined) patch.riscoInsuficienciaRenal = dto.riscoInsuficienciaRenal;
    if (dto.riscoLesaoUretral !== undefined) patch.riscoLesaoUretral = dto.riscoLesaoUretral;
    if (dto.riscoPerdasNoturnas !== undefined) patch.riscoPerdasNoturnas = dto.riscoPerdasNoturnas;

    if (dto.deficienciaLubrificacao !== undefined) patch.deficienciaLubrificacao = dto.deficienciaLubrificacao;
    if (dto.deficienciaPontaProtetora !== undefined) patch.deficienciaPontaProtetora = dto.deficienciaPontaProtetora;
    if (dto.deficienciaMangaProtetora !== undefined) patch.deficienciaMangaProtetora = dto.deficienciaMangaProtetora;
    if (dto.deficienciaDor !== undefined) patch.deficienciaDor = dto.deficienciaDor;
    if (dto.deficienciaAlergiaLidocaina !== undefined) patch.deficienciaAlergiaLidocaina = dto.deficienciaAlergiaLidocaina;
    if (dto.deficienciaFrascoReutilizado !== undefined) patch.deficienciaFrascoReutilizado = dto.deficienciaFrascoReutilizado;
    if (dto.deficienciaRiscoInternacao !== undefined) patch.deficienciaRiscoInternacao = dto.deficienciaRiscoInternacao;

    if (dto.prescricaoIncluirCodigoFabricante !== undefined) patch.prescricaoIncluirCodigoFabricante = dto.prescricaoIncluirCodigoFabricante;
    if (dto.prescricaoEmbalagemPocket !== undefined) patch.prescricaoEmbalagemPocket = dto.prescricaoEmbalagemPocket;
    if (dto.prescricaoClausulaMarca !== undefined) patch.prescricaoClausulaMarca = dto.prescricaoClausulaMarca;
    if (dto.prescricaoCateterExterno !== undefined) patch.prescricaoCateterExterno = dto.prescricaoCateterExterno;
    if (dto.prescricaoIncluirObjetivo !== undefined) patch.prescricaoIncluirObjetivo = dto.prescricaoIncluirObjetivo;
    if (dto.prescricaoIncluirConclusao !== undefined) patch.prescricaoIncluirConclusao = dto.prescricaoIncluirConclusao;
    // Objeto inteiro é substituído quando enviado — mesma convenção de produtosSolicitados.
    if (dto.cateterExterno !== undefined) {
      patch.cateterExterno = {
        incluirDescricaoTecnica: dto.cateterExterno.incluirDescricaoTecnica ?? LAUDO_MEDICO_CATETER_EXTERNO_DEFAULTS.incluirDescricaoTecnica,
        incluirCodigoSiafisico: dto.cateterExterno.incluirCodigoSiafisico ?? LAUDO_MEDICO_CATETER_EXTERNO_DEFAULTS.incluirCodigoSiafisico,
      };
    }

    if (dto.produtosSolicitados !== undefined) patch.produtosSolicitados = dto.produtosSolicitados;
    if (dto.comparativoAnvisa !== undefined) patch.comparativoAnvisa = dto.comparativoAnvisa;

    if (dto.medicoNomeExibicao !== undefined) patch.medicoNomeExibicao = dto.medicoNomeExibicao;
    if (dto.medicoEspecialidade !== undefined) patch.medicoEspecialidade = dto.medicoEspecialidade;
    if (dto.crmExibicao !== undefined) patch.crmExibicao = dto.crmExibicao;
    if (dto.cidadeEmissao !== undefined) patch.cidadeEmissao = dto.cidadeEmissao;

    const atualizado = await this.repo.update(resolved, id, patch);
    if (!atualizado) throw new ConflictException('Não foi possível atualizar o relatório médico.');
    return atualizado;
  }

  async encaminharParaRevisao(id: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<LaudoMedico> {
    const resolved = this.resolveClinicaId(user, clinicaId);
    const laudo = await this.repo.findById(resolved, id);
    if (!laudo) throw new NotFoundException('Relatório médico não encontrado.');
    if (laudo.status !== StatusLaudoMedico.RASCUNHO) throw new ConflictException('Só é possível encaminhar relatórios em rascunho.');
    this.assertPodeEditar(laudo, user);

    const atualizado = await this.repo.update(resolved, id, { status: StatusLaudoMedico.AGUARDANDO_REVISAO });
    if (!atualizado) throw new ConflictException('Não foi possível encaminhar o relatório médico.');
    return atualizado;
  }

  async findOne(id: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<LaudoMedico> {
    const laudo = await this.repo.findById(this.resolveClinicaId(user, clinicaId), id);
    if (!laudo) throw new NotFoundException('Laudo médico não encontrado.');
    return laudo;
  }

  async listByPaciente(pacienteId: string, clinicaId: string | undefined, user: AuthTokenPayload): Promise<LaudoMedico[]> {
    if (!pacienteId) throw new BadRequestException('pacienteId é obrigatório.');
    return this.repo.listByPaciente(this.resolveClinicaId(user, clinicaId), pacienteId);
  }

  async listPendentesRevisao(clinicaId: string | undefined, user: AuthTokenPayload): Promise<LaudoMedico[]> {
    return this.repo.listByStatus(this.resolveClinicaId(user, clinicaId), StatusLaudoMedico.AGUARDANDO_REVISAO);
  }

  async assinar(id: string, crmNumero: string | undefined, clinicaId: string | undefined, user: AuthTokenPayload): Promise<LaudoMedico> {
    const resolved = this.resolveClinicaId(user, clinicaId);
    const laudo = await this.repo.findById(resolved, id);
    if (!laudo) throw new NotFoundException('Laudo médico não encontrado.');
    if (laudo.status === StatusLaudoMedico.ASSINADO) throw new ConflictException('Laudo já assinado.');

    const dataAssinatura = new Date();
    const hash = createHmac('sha256', process.env.JWT_ACCESS_SECRET ?? 'nuvita-secret')
      .update(JSON.stringify({ id: laudo.id, medicoId: user.sub, dataAssinatura: dataAssinatura.toISOString() }))
      .digest('hex');

    const signed = await this.repo.assinar(resolved, id, { medicoId: user.sub, crmNumero, dataAssinatura, hash });
    if (!signed) throw new ConflictException('Não foi possível assinar o laudo.');

    await this.pacientesService.avancarEtapaFluxo(
      resolved, signed.pacienteId, EtapaFluxoClinico.AGUARDANDO_ENVIO_JURIDICO,
      { ip: 'internal', userAgent: 'pipeline-clinico', user },
    );

    return signed;
  }

  /** Só quem criou o rascunho (enquanto ainda é rascunho) ou um revisor (médico/admin) pode editar/encaminhar. */
  private assertPodeEditar(laudo: LaudoMedico, user: AuthTokenPayload): void {
    const ehRevisor = (PODE_REVISAR as Papel[]).includes(user.papel);
    const ehAutorEmRascunho = laudo.criadoPorId === user.sub && laudo.status === StatusLaudoMedico.RASCUNHO;
    if (!ehRevisor && !ehAutorEmRascunho) {
      throw new ForbiddenException('Você não tem permissão para editar este relatório médico.');
    }
  }

  private resolveClinicaId(user: AuthTokenPayload, requested?: string): string {
    if (user.clinicaId) return user.clinicaId;
    if (requested) return requested;
    throw new BadRequestException('clinicaId é obrigatório.');
  }
}
