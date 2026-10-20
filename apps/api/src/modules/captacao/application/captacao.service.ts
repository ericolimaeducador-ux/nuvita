import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RequestAuditContext } from '../../pacientes/application/pacientes.service';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { PacienteCryptoService } from '../../pacientes/infrastructure/crypto/paciente-crypto.service';
import { CreateCaptacaoDto } from './dto/create-captacao.dto';
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
  codigoEnfermeiro: string;
  status: string;
  criadoEm: string;
}

@Injectable()
export class CaptacaoService {
  private readonly logger = new Logger(CaptacaoService.name);

  constructor(
    @InjectModel(CapitacaoPacienteMongo.name)
    private readonly captacoes: Model<CapitacaoPacienteDocument>,
    private readonly crypto: PacienteCryptoService,
    private readonly pacientes: PacientesService,
  ) {}

  async create(dto: CreateCaptacaoDto): Promise<{ success: true; message: string }> {
    const nome = dto.nome?.trim() || undefined;
    const cpf = dto.cpf?.trim() || undefined;
    const endereco = dto.endereco?.trim() || undefined;
    const telefone = dto.telefone.trim();
    const email = dto.email?.trim().toLowerCase() || undefined;
    if (!telefone) throw new BadRequestException('Telefone obrigatorio.');
    const cpfHash = cpf ? this.crypto.cpfHash(cpf) : undefined;
    try {
      await this.captacoes.create({
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

    return { success: true, message: 'Paciente cadastrado na captação com sucesso!' };
  }

  async listPending(): Promise<{ success: true; data: CaptacaoPublica[] }> {
    const docs = await this.captacoes.find({ status: 'pendente' }).sort({ criadoEm: -1 }).exec();
    return { success: true, data: docs.map((doc) => this.toPublic(doc)) };
  }

  /**
   * Cadastra o paciente na collection `pacientes` (criptografada, no tenant de
   * quem exporta). O prontuário do Nuvita é o cadastro do paciente + evoluções
   * SOAP; não gravamos um prontuário vazio, porque o schema exige médico e
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
      const paciente = await this.pacientes.create(
        {
          clinicaId,
          nome: dados.nome || `Interessado sem nome (${dados.telefone})`,
          cpf: dados.cpf,
          dataNascimento: dados.dataNascimento,
          telefone: dados.telefone,
          email: dados.email,
          endereco: dados.endereco ? { logradouro: dados.endereco } : undefined,
          representante: dados.codigoEnfermeiro,
        },
        context,
      );
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
      codigoEnfermeiro: doc.codigoEnfermeiro,
      status: doc.status,
      criadoEm: doc.criadoEm.toISOString(),
    };
  }
}
