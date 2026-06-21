import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { CreateUserInput, UpdateUserInput, UserFilters, UserRepository } from '../../application/ports/user.repository';
import { User } from '../../domain/user.entity';
import { UserDocument, UserMongo } from './user.schema';

@Injectable()
export class UserMongoRepository implements UserRepository {
  constructor(@InjectModel(UserMongo.name) private readonly userModel: Model<UserDocument>) {}

  async create(input: CreateUserInput): Promise<User> {
    const created = await this.userModel.create({
      nome: input.nome,
      email: input.email,
      passwordHash: input.passwordHash,
      papel: input.papel,
      clinicaId: input.clinicaId,
      '2faSecret': input.twoFactorSecret,
      ativo: true,
    });

    return this.toEntity(created);
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.userModel.findOne({ email: email.toLowerCase() }).exec();
    return user ? this.toEntity(user) : null;
  }

  async findByEmailWithSecrets(email: string): Promise<User | null> {
    const user = await this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+passwordHash +2faSecret')
      .exec();

    return user ? this.toEntity(user) : null;
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.userModel.findById(id).exec();
    return user ? this.toEntity(user) : null;
  }

  async findAll(filters: UserFilters, skip: number, limit: number): Promise<User[]> {
    const docs = await this.userModel
      .find(this.buildQuery(filters))
      .sort({ criadoEm: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    return docs.map((d) => this.toEntity(d));
  }

  async count(filters: UserFilters): Promise<number> {
    return this.userModel.countDocuments(this.buildQuery(filters)).exec();
  }

  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    const set: Record<string, unknown> = {};
    if (input.nome !== undefined) set['nome'] = input.nome;
    if (input.papel !== undefined) set['papel'] = input.papel;
    if (input.clinicaId !== undefined) set['clinicaId'] = input.clinicaId;
    if (input.ativo !== undefined) set['ativo'] = input.ativo;
    if (input.passwordHash !== undefined) set['passwordHash'] = input.passwordHash;

    const doc = await this.userModel
      .findByIdAndUpdate(id, { $set: set }, { new: true })
      .exec();
    return doc ? this.toEntity(doc) : null;
  }

  private buildQuery(filters: UserFilters): FilterQuery<UserDocument> {
    const query: FilterQuery<UserDocument> = {};
    if (filters.papel !== undefined) query['papel'] = filters.papel;
    if (filters.clinicaId !== undefined) query['clinicaId'] = filters.clinicaId;
    if (filters.ativo !== undefined) query['ativo'] = filters.ativo;
    if (filters.search) {
      const regex = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query['$or'] = [{ nome: regex }, { email: regex }];
    }
    return query;
  }

  private toEntity(document: UserDocument): User {
    const object = document.toObject({ getters: false });

    return {
      id: object._id.toString(),
      nome: object.nome,
      email: object.email,
      passwordHash: object.passwordHash,
      papel: object.papel,
      clinicaId: object.clinicaId,
      twoFactorSecret: object['2faSecret'],
      ativo: object.ativo,
      criadoEm: object.criadoEm,
    };
  }
}
