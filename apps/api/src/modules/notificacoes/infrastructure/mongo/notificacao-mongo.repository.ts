import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreateNotificacaoInput,
  NotificacaoDashboardFilter,
  NotificacaoDashboardResult,
  NotificacaoPreferenciaRepository,
  NotificacaoRepository,
} from '../../application/ports/notificacao.repository';
import {
  CanalNotificacao,
  Notificacao,
  PreferenciaNotificacao,
  StatusNotificacao,
} from '../../domain/notificacao.entity';
import {
  NotificacaoDocument,
  NotificacaoMongo,
  NotificacaoPreferenciaDocument,
  NotificacaoPreferenciaMongo,
} from './notificacao.schema';

@Injectable()
export class NotificacaoMongoRepository implements NotificacaoRepository {
  constructor(@InjectModel(NotificacaoMongo.name) private readonly model: Model<NotificacaoDocument>) {}

  async create(input: CreateNotificacaoInput): Promise<Notificacao> {
    const created = await this.model.create(input);
    return this.toEntity(created);
  }

  async findById(id: string): Promise<Notificacao | null> {
    const document = await this.model.findById(id).exec();
    return document ? this.toEntity(document) : null;
  }

  async markQueued(id: string): Promise<void> {
    await this.model.updateOne({ _id: id }, { $set: { status: StatusNotificacao.PENDENTE } }).exec();
  }

  async recordAttempt(id: string, error?: Error | string): Promise<Notificacao | null> {
    const message = error ? (typeof error === 'string' ? error : error.message) : undefined;
    const document = await this.model
      .findByIdAndUpdate(
        id,
        {
          $inc: { tentativas: 1 },
          ...(message
            ? {
                $push: {
                  erros: {
                    mensagem: message,
                    data: new Date(),
                    detalhe: typeof error === 'string' ? undefined : error?.stack,
                  },
                },
              }
            : {}),
        },
        { new: true },
      )
      .exec();

    return document ? this.toEntity(document) : null;
  }

  async markSent(id: string): Promise<Notificacao | null> {
    const document = await this.model
      .findByIdAndUpdate(
        id,
        {
          $set: {
            status: StatusNotificacao.ENVIADO,
            enviadoEm: new Date(),
          },
        },
        { new: true },
      )
      .exec();

    return document ? this.toEntity(document) : null;
  }

  async markFailed(id: string, error: Error | string): Promise<Notificacao | null> {
    void error;
    const document = await this.model
      .findByIdAndUpdate(
        id,
        {
          $set: { status: StatusNotificacao.FALHOU },
        },
        { new: true },
      )
      .exec();

    return document ? this.toEntity(document) : null;
  }

  async dashboard(filter: NotificacaoDashboardFilter): Promise<NotificacaoDashboardResult> {
    const query = {
      clinicaId: filter.clinicaId,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.canal ? { canal: filter.canal } : {}),
      ...(filter.tipo ? { tipo: filter.tipo } : {}),
      ...(filter.inicio || filter.fim
        ? {
            criadoEm: {
              ...(filter.inicio ? { $gte: filter.inicio } : {}),
              ...(filter.fim ? { $lte: filter.fim } : {}),
            },
          }
        : {}),
    };

    const [statusCounts, canalCounts, recentes] = await Promise.all([
      this.model.aggregate([{ $match: query }, { $group: { _id: '$status', total: { $sum: 1 } } }]).exec(),
      this.model.aggregate([{ $match: query }, { $group: { _id: '$canal', total: { $sum: 1 } } }]).exec(),
      this.model.find(query).sort({ criadoEm: -1 }).limit(50).exec(),
    ]);

    return {
      resumo: this.countMap<StatusNotificacao>(statusCounts, Object.values(StatusNotificacao)),
      porCanal: this.countMap<CanalNotificacao>(canalCounts, Object.values(CanalNotificacao)),
      recentes: recentes.map((document) => this.toEntity(document)),
    };
  }

  private countMap<T extends string>(counts: { _id: T; total: number }[], keys: T[]): Record<T, number> {
    return keys.reduce(
      (acc, key) => ({
        ...acc,
        [key]: counts.find((count) => count._id === key)?.total ?? 0,
      }),
      {} as Record<T, number>,
    );
  }

  private toEntity(document: NotificacaoDocument): Notificacao {
    const object = document.toObject({ getters: false });
    return {
      id: object._id.toString(),
      clinicaId: object.clinicaId,
      destinatarioId: object.destinatarioId,
      tipo: object.tipo,
      canal: object.canal,
      status: object.status,
      conteudo: object.conteudo as unknown as Notificacao['conteudo'],
      tentativas: object.tentativas,
      erros: object.erros as unknown as Notificacao['erros'],
      criadoEm: object.criadoEm,
      enviadoEm: object.enviadoEm,
    };
  }
}

@Injectable()
export class NotificacaoPreferenciaMongoRepository implements NotificacaoPreferenciaRepository {
  constructor(
    @InjectModel(NotificacaoPreferenciaMongo.name)
    private readonly model: Model<NotificacaoPreferenciaDocument>,
  ) {}

  async findByPaciente(clinicaId: string, pacienteId: string): Promise<PreferenciaNotificacao | null> {
    const document = await this.model.findOne({ clinicaId, pacienteId }).exec();
    return document ? this.toEntity(document) : null;
  }

  async upsertOptOut(
    clinicaId: string,
    pacienteId: string,
    canaisOptOut: CanalNotificacao[],
  ): Promise<PreferenciaNotificacao> {
    const document = await this.model
      .findOneAndUpdate(
        { clinicaId, pacienteId },
        { $set: { canaisOptOut, atualizadoEm: new Date() } },
        { new: true, upsert: true },
      )
      .exec();

    return this.toEntity(document!);
  }

  private toEntity(document: NotificacaoPreferenciaDocument): PreferenciaNotificacao {
    const object = document.toObject({ getters: false });
    return {
      id: object._id.toString(),
      clinicaId: object.clinicaId,
      pacienteId: object.pacienteId,
      canaisOptOut: object.canaisOptOut,
      atualizadoEm: object.atualizadoEm,
    };
  }
}
