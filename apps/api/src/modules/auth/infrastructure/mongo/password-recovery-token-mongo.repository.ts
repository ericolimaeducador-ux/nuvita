import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  CreatePasswordRecoveryTokenInput,
  PasswordRecoveryTokenRepository,
} from '../../application/ports/password-recovery-token.repository';
import { PasswordRecoveryToken, PasswordRecoveryTokenTipo } from '../../domain/password-recovery-token.entity';
import { PasswordRecoveryTokenDocument, PasswordRecoveryTokenMongo } from './password-recovery-token.schema';

@Injectable()
export class PasswordRecoveryTokenMongoRepository implements PasswordRecoveryTokenRepository {
  constructor(
    @InjectModel(PasswordRecoveryTokenMongo.name)
    private readonly model: Model<PasswordRecoveryTokenDocument>,
  ) {}

  async create(input: CreatePasswordRecoveryTokenInput): Promise<PasswordRecoveryToken> {
    const created = await this.model.create({
      userId: input.userId,
      tipo: input.tipo,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      attempts: 0,
    });
    return this.toEntity(created);
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordRecoveryToken | null> {
    const doc = await this.model.findOne({ tokenHash, consumedAt: { $exists: false } }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async findActiveByUser(userId: string, tipo: PasswordRecoveryTokenTipo): Promise<PasswordRecoveryToken | null> {
    const doc = await this.model
      .findOne({ userId, tipo, consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } })
      .sort({ _id: -1 })
      .exec();
    return doc ? this.toEntity(doc) : null;
  }

  async incrementAttempts(id: string): Promise<PasswordRecoveryToken | null> {
    const doc = await this.model
      .findByIdAndUpdate(id, { $inc: { attempts: 1 } }, { new: true })
      .exec();
    return doc ? this.toEntity(doc) : null;
  }

  async consume(id: string): Promise<void> {
    await this.model.findByIdAndUpdate(id, { $set: { consumedAt: new Date() } }).exec();
  }

  async deleteAllForUser(userId: string, tipo?: PasswordRecoveryTokenTipo): Promise<void> {
    await this.model.deleteMany({ userId, ...(tipo ? { tipo } : {}) }).exec();
  }

  private toEntity(document: PasswordRecoveryTokenDocument): PasswordRecoveryToken {
    const object = document.toObject({ getters: false });
    return {
      id: object._id.toString(),
      userId: object.userId,
      tipo: object.tipo,
      tokenHash: object.tokenHash,
      expiresAt: object.expiresAt,
      attempts: object.attempts,
      consumedAt: object.consumedAt,
    };
  }
}
