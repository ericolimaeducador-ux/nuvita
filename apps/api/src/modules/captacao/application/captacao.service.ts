import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { isValidObjectId, Model } from 'mongoose';
import { AUDIT_LOG_REPOSITORY } from '../../auth/auth.constants';
import { AuditLogRepository } from '../../auth/application/ports/audit-log.repository';
import { AuditEvent } from '../../auth/domain/audit-event.enum';
import { CreatePacienteDto } from '../../pacientes/application/dto/create-paciente.dto';
import { RequestAuditContext } from '../../pacientes/application/pacientes.service';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { ClassificacaoArea } from '../../pacientes/domain/paciente.entity';
import { PacienteCryptoService } from '../../pacientes/infrastructure/crypto/paciente-crypto.service';
import { CreateCaptacaoDto } from './dto/create-captacao.dto';
import { UpdateCaptacaoDto } from './dto/update-captacao.dto';
import {
  CapitacaoPacienteDocument,
  CapitacaoPacienteMongo,
} from '../infrastructure/mongo/capitacao-paciente.schema';

const LOCK_MS = 2 * 60 * 1000;

export interface CaptacaoPublica {
  id: string;
  nome?: string;
  cpf?: string;
  dataNascimento?: string;
  endereco?: string;
  telefone: string;
  email?: string;
  responsavelLegal?: { nome?: string; cpf?: string; telefone?: string; email?: string; vinculo?: string };
  autorizacaoResponsavel?: { confirmado: boolean };
  codigoEnfermeiro: string;
  status: string;
  criadoEm: string;
}

/** Origem da requisição PÚBLICA de captação (sem usuário): só ip/user-agent para a auditoria. */
export interface CaptacaoOrigem {
  ip: string;
  userAgent: string;
}

@Injectable()
export class CaptacaoService {
  private readonly logger = new Logger(CaptacaoService.name);

  constructor(
    @InjectModel(CapitacaoPacienteMongo.name)
    private readonly captacoes: Model<CapitacaoPacienteDocument>,
    private readonly crypto: PacienteCryptoService,
    private readonly pacientes: PacientesService,
    @Inject(AUDIT_LOG_REPOSITORY) private readonly auditLogs: AuditLogRepository,
  ) {}

  async create(dto: CreateCaptacaoDto, origem: CaptacaoOrigem): Promise<{ success: true; message: string }> {
    const nome = dto.nome?.trim() || undefined;
    const cpf = dto.cpf?.trim() || undefined;
    const endereco = dto.endereco?.trim() || undefined;
    const telefone = dto.telefone.trim();
    const email = dto.email?.trim().toLowerCase() || undefined;
    if (!telefone) throw new BadRequestException('Telefone obrigatorio.');
    const cpfHash = cpf ? this.crypto.cpfHash(cpf) : undefined;
    let criada: CapitacaoPacienteDocument;
    try {
      criada = await this.captacoes.create({
        ...(nome ? { nome } : {}),
        ...(cpf && cpfHash ? { cpf: this.crypto.encryptString(this.crypto.normalizeCpf(cpf)), cpfHash } : {}),
        ...(dto.dataNascimento ? { dataNascimento: new Date(dto.dataNascimento) } : {}),
        ...(endereco ? { endereco: this.crypto.encryptString(endereco) } : {}),
        telefone: this.crypto.encryptString(telefone),
        ...(email ? { email: this.crypto.encryptString(email) } : {}),
        codigoEnfermeiro: dto.codigoEnfermeiro,
        status: 'pendente',
        criadoEm: new Date(),
      });
    } catch (error) {
      const mongoError = error as { code?: number };
      if (mongoError.code === 11000) {
        throw new ConflictException('Já existe uma captação pendente com este CPF.');
      }
      throw error;
    }

    // Rota pública (sem usuário): audita só QUE houve captação, com o id e o código do captador — nada de dado pessoal.
    await this.auditLogs.create({
      event: AuditEvent.CAPTACAO_CREATED,
      ip: origem.ip,
      userAgent: origem.userAgent,
      metadata: { captacaoId: String(criada._id), codigoEnfermeiro: dto.codigoEnfermeiro },
    });

    return { success: true, message: 'Paciente cadastrado na captação com sucesso!' };
  }

  async listPending(): Promise<{ success: true; data: CaptacaoPublica[] }> {
    const docs = await this.captacoes.find({ status: 'pendente' }).sort({ criadoEm: -1 }).exec();
    return { success: true, data: docs.map((doc) => this.toPublic(doc)) };
  }

  /**
   * Completa um lead PENDENTE (ex.: data de nascimento, CPF, responsável legal de menor). Só salva — NÃO exporta.
   * O lead não tem clinicaId até ser exportado, então o acesso segue a gestão da fila (ver controller).
   * Audita só o id e os NOMES dos campos alterados (nunca os valores).
   */
  async atualizar(
    id: string,
    dto: UpdateCaptacaoDto,
    context: RequestAuditContext,
  ): Promise<{ success: true; data: CaptacaoPublica }> {
    if (!isValidObjectId(id)) throw new NotFoundException('Registro de captação não encontrado.');

    const set: Record<string, unknown> = {};
    const nome = dto.nome?.trim();
    if (nome) set['nome'] = nome;
    const cpf = dto.cpf?.trim();
    if (cpf) {
      set['cpf'] = this.crypto.encryptString(this.crypto.normalizeCpf(cpf));
      set['cpfHash'] = this.crypto.cpfHash(cpf);
    }
    if (dto.dataNascimento) set['dataNascimento'] = new Date(dto.dataNascimento);
    const endereco = dto.endereco?.trim();
    if (endereco) set['endereco'] = this.crypto.encryptString(endereco);
    const email = dto.email?.trim().toLowerCase();
    if (email) set['email'] = this.crypto.encryptString(email);
    if (dto.responsavelLegal) {
      set['responsavelLegal'] = this.crypto.encryptString(JSON.stringify(dto.responsavelLegal));
    }
    if (dto.autorizacaoResponsavel) {
      set['autorizacaoResponsavelConfirmada'] = dto.autorizacaoResponsavel.confirmado;
    }
    if (Object.keys(set).length === 0) throw new BadRequestException('Informe ao menos um campo para atualizar.');

    let atualizada: CapitacaoPacienteDocument | null;
    try {
      atualizada = await this.captacoes.findOneAndUpdate({ _id: id, status: 'pendente' }, { $set: set }, { new: true }).exec();
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException('Já existe uma captação pendente com este CPF.');
      }
      throw error;
    }

    if (!atualizada) {
      const existe = await this.captacoes.findById(id).exec();
      if (!existe) throw new NotFoundException('Registro de captação não encontrado.');
      throw new BadRequestException('Este paciente já foi exportado: a captação não pode mais ser editada.');
    }

    await this.auditLogs.create({
      event: AuditEvent.CAPTACAO_UPDATED,
      userId: context.user.sub,
      email: context.user.email,
      clinicaId: context.user.clinicaId ?? undefined,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { captacaoId: id, campos: Object.keys(set) },
    });

    return { success: true, data: this.toPublic(atualizada) };
  }

  /**
   * Exporta o lead para a collection `pacientes` (criptografada, no tenant de quem exporta).
   *
   * A captação é só do programa de IU: o paciente nasce com classificacoes=['IU'] e, por ser elegível ao fluxo
   * clínico, o PacientesService.create já o coloca em AGUARDANDO_ATENDIMENTO (etapa inicial do fluxo).
   *
   * Vale a validação do cadastro de paciente do psi (CreatePacienteDto: CPF válido quando informado, data de
   * nascimento obrigatória e não futura...). Lead que não a atende NÃO é exportado: a resposta é 400 com o que falta e a
   * captação continua pendente. Menor de idade exige responsável legal, que a captação não coleta — esse caso também é
   * recusado pelo PacientesService.create.
   *
   * O prontuário do Nuvita é o cadastro do paciente + evoluções; não gravamos um prontuário vazio, porque o schema exige
   * registro clínico e o documento não pode ser apagado.
   */
  async exportar(
    id: string,
    context: RequestAuditContext,
  ): Promise<{ success: true; message: string; pacienteId: string }> {
    const clinicaId = context.user.clinicaId;
    if (!clinicaId) {
      throw new BadRequestException('Selecione uma clínica para cadastrar o paciente.');
    }
    if (!isValidObjectId(id)) throw new NotFoundException('Registro de captação não encontrado.');

    const agora = new Date();
    const lockAntes = new Date(agora.getTime() - LOCK_MS);
    const claimed = await this.captacoes
      .findOneAndUpdate(
        {
          _id: id,
          status: 'pendente',
          $or: [
            { exportandoEm: { $exists: false } },
            { exportandoEm: null },
            { exportandoEm: { $lt: lockAntes } },
          ],
        },
        { $set: { exportandoEm: agora } },
        { new: true },
      )
      .exec();

    if (!claimed) {
      const existe = await this.captacoes.findById(id).exec();
      if (!existe) throw new NotFoundException('Registro de captação não encontrado.');
      if (existe.status === 'exportado') {
        throw new BadRequestException('Este paciente já foi exportado para o prontuário.');
      }
      throw new ConflictException('Esta captação já está sendo exportada. Tente novamente em instantes.');
    }

    let pacienteId: string | undefined;

    try {
      const dados = this.toPublic(claimed);
      const dtoPaciente = plainToInstance(CreatePacienteDto, {
        clinicaId,
        // Programa de IU: classificação fixa. Eligível ao fluxo => PacientesService.create define a etapa inicial.
        classificacoes: [ClassificacaoArea.IU],
        nome: dados.nome || `Interessado sem nome (${dados.telefone})`,
        cpf: dados.cpf,
        dataNascimento: dados.dataNascimento,
        telefone: dados.telefone,
        email: dados.email,
        endereco: dados.endereco ? { logradouro: dados.endereco } : undefined,
        representante: dados.codigoEnfermeiro,
        // Menor de idade: o responsável completado no lead segue para o cadastro; sem ele (ou sem a autorização) o
        // PacientesService.create recusa a exportação.
        responsavelLegal: dados.responsavelLegal,
        autorizacaoResponsavel: dados.autorizacaoResponsavel,
      });
      const erros = await validate(dtoPaciente, { whitelist: true, forbidNonWhitelisted: true });
      if (erros.length > 0) {
        // Só os NOMES dos campos (nunca os valores) vão na mensagem.
        const campos = erros.map((e) => e.property).join(', ');
        throw new BadRequestException(
          `Captação incompleta ou inválida para cadastrar o paciente (campos: ${campos}). Ela segue pendente.`,
        );
      }
      const paciente = await this.pacientes.create(dtoPaciente, context);
      pacienteId = paciente.id;

      try {
        await this.pacientes.updateObservacoes(
          paciente.id,
          {
            observacoes: `Origem: Captação Externa. Enfermeiro captador: ${dados.codigoEnfermeiro}.`,
          },
          clinicaId,
          context,
        );
      } catch (error) {
        this.logger.warn(
          `Paciente ${paciente.id} cadastrado pela captação ${id} sem observação: ${(error as Error).message}`,
        );
      }
    } catch (error) {
      await this.captacoes
        .updateOne({ _id: id, status: 'pendente' }, { $unset: { exportandoEm: 1 } })
        .exec();
      throw error;
    }

    await this.captacoes
      .updateOne(
        { _id: id },
        {
          $set: {
            status: 'exportado',
            pacienteId,
            clinicaId,
            exportadoEm: new Date(),
          },
          $unset: { exportandoEm: 1 },
        },
      )
      .exec();

    await this.auditLogs.create({
      event: AuditEvent.CAPTACAO_EXPORTED,
      userId: context.user.sub,
      email: context.user.email,
      clinicaId,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { clinicaId, captacaoId: id, pacienteId },
    });

    return {
      success: true,
      message: 'Paciente migrado com sucesso para o prontuário!',
      pacienteId: pacienteId!,
    };
  }

  private toPublic(doc: CapitacaoPacienteDocument): CaptacaoPublica {
    return {
      id: doc._id.toString(),
      nome: doc.nome,
      cpf: doc.cpf ? this.crypto.decryptString(doc.cpf) : undefined,
      dataNascimento: doc.dataNascimento?.toISOString(),
      endereco: doc.endereco ? this.crypto.decryptString(doc.endereco) : undefined,
      telefone: this.crypto.decryptString(doc.telefone),
      email: doc.email ? this.crypto.decryptString(doc.email) : undefined,
      responsavelLegal: doc.responsavelLegal ? JSON.parse(this.crypto.decryptString(doc.responsavelLegal)) : undefined,
      autorizacaoResponsavel:
        doc.autorizacaoResponsavelConfirmada === undefined ? undefined : { confirmado: doc.autorizacaoResponsavelConfirmada },
      codigoEnfermeiro: doc.codigoEnfermeiro,
      status: doc.status,
      criadoEm: doc.criadoEm.toISOString(),
    };
  }
}
