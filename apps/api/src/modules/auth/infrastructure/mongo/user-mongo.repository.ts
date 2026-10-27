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
      registroProfissional: input.registroProfissional,
      crp: input.crp,
      deveTrocarSenha: input.deveTrocarSenha,
      faseTeste: input.faseTeste ?? false,
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
    if (input.email !== undefined) set['email'] = input.email;
    if (input.papel !== undefined) set['papel'] = input.papel;
    if (input.clinicaId !== undefined) set['clinicaId'] = input.clinicaId;
    if (input.ativo !== undefined) set['ativo'] = input.ativo;
    if (input.passwordHash !== undefined) set['passwordHash'] = input.passwordHash;
    if (input.twoFactorSecret !== undefined) set['2faSecret'] = input.twoFactorSecret;
    if (input.registroProfissional !== undefined) set['registroProfissional'] = input.registroProfissional;
    if (input.crp !== undefined) set['crp'] = input.crp;
    if (input.modulosConcedidos !== undefined) set['modulosConcedidos'] = input.modulosConcedidos;
    if (input.modulosRevogados !== undefined) set['modulosRevogados'] = input.modulosRevogados;
    if (input.deveTrocarSenha !== undefined) set['deveTrocarSenha'] = input.deveTrocarSenha;
    if (input.termosAceitos !== undefined) set['termosAceitos'] = input.termosAceitos;
    if (input.faseTeste !== undefined) set['faseTeste'] = input.faseTeste;
    if (input.tokensValidosApartirDe !== undefined) set['tokensValidosApartirDe'] = input.tokensValidosApartirDe;

    // Qualquer troca de senha (reset do super-admin, troca obrigatória, reset por e-mail) invalida
    // o link de redefinição pendente.
    const update: Record<string, unknown> = { $set: set };
    if (input.passwordHash !== undefined) update['$unset'] = { resetSenha: '' };

    const doc = await this.userModel.findByIdAndUpdate(id, update, { new: true }).exec();
    return doc ? this.toEntity(doc) : null;
  }

  async salvarResetSenha(id: string, tokenHash: string, expiraEm: Date): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(id, { $set: { resetSenha: { tokenHash, expiraEm } } }, { new: true })
      .exec();
  }

  async redefinirSenhaComToken(tokenHash: string, passwordHash: string, agora: Date): Promise<User | null> {
    const doc = await this.userModel
      .findOneAndUpdate(
        { 'resetSenha.tokenHash': tokenHash, 'resetSenha.expiraEm': { $gt: agora }, ativo: true },
        {
          $set: { passwordHash, deveTrocarSenha: false, tokensValidosApartirDe: agora },
          $unset: { resetSenha: '' },
        },
        { new: true },
      )
      .exec();
    return doc ? this.toEntity(doc) : null;
  }

  async definirFaseTesteDaClinica(clinicaId: string, faseTeste: boolean): Promise<number> {
    const result = await this.userModel
      .updateMany({ clinicaId, faseTeste: { $ne: faseTeste } }, { $set: { faseTeste } })
      .exec();
    return result.modifiedCount;
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
      registroProfissional: object.registroProfissional,
      crp: object.crp,
      ativo: object.ativo,
      criadoEm: object.criadoEm,
      deveTrocarSenha: object.deveTrocarSenha ?? false,
      termosAceitos: object.termosAceitos
        ? { versao: object.termosAceitos.versao, dataAceite: object.termosAceitos.dataAceite }
        : null,
      faseTeste: object.faseTeste ?? false,
      modulosConcedidos: object.modulosConcedidos,
      modulosRevogados: object.modulosRevogados,
      tokensValidosApartirDe: object.tokensValidosApartirDe,
    };
  }
}
