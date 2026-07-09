import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Modulo, Papel } from '../../../../../../../packages/shared/src/auth';

export type UserDocument = HydratedDocument<UserMongo>;

@Schema({ collection: 'users', versionKey: false })
export class UserMongo {
  @Prop({ required: true, trim: true })
  nome!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ required: true, enum: Object.values(Papel), index: true })
  papel!: Papel;

  @Prop({ index: true })
  clinicaId?: string;

  @Prop({ select: false })
  '2faSecret'?: string;

  // Registro do conselho profissional (CRM/COREN/OAB) — usado para preencher
  // automaticamente documentos assinados pelo profissional.
  @Prop({ trim: true })
  registroProfissional?: string;

  @Prop({ default: true, index: true })
  ativo!: boolean;

  // Exceções de permissão por usuário (padrão do papel fica no código compartilhado).
  @Prop({ type: [String], enum: Object.values(Modulo), default: undefined })
  modulosConcedidos?: Modulo[];

  @Prop({ type: [String], enum: Object.values(Modulo), default: undefined })
  modulosRevogados?: Modulo[];

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserMongo);
UserSchema.index({ clinicaId: 1, _id: 1 });
