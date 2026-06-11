import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserInput, UserRepository } from '../../application/ports/user.repository';
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
