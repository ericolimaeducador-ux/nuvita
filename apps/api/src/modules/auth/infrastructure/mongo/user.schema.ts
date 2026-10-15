import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Modulo, Papel } from '../../../../../../../packages/shared/src/auth';

export type UserDocument = HydratedDocument<UserMongo>;

// Aceite dos Termos de Uso do profissional (feature-terms-of-service-acceptance).
// Formato espelha ConsentimentoLGPDMongo do paciente — mesma convenção já validada.
@Schema({ _id: false, versionKey: false })
export class TermosAceitosMongo {
  @Prop({ required: true })
  versao!: string;

  @Prop({ required: true })
  dataAceite!: Date;
}

const TermosAceitosSchema = SchemaFactory.createForClass(TermosAceitosMongo);

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

  // CRP do psicólogo (timbre dos documentos clínicos). Sem unique: o formato não é validado.
  @Prop({ trim: true })
  crp?: string;

  @Prop({ default: true, index: true })
  ativo!: boolean;

  // Exceções de permissão por usuário (padrão do papel fica no código compartilhado).
  @Prop({ type: [String], enum: Object.values(Modulo), default: undefined })
  modulosConcedidos?: Modulo[];

  @Prop({ type: [String], enum: Object.values(Modulo), default: undefined })
  modulosRevogados?: Modulo[];

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;

  // Troca de senha obrigatória no 1º login (feature-forced-password-change).
  // Nasce false; só o onboarding de clínica seta true. Ausente em docs antigos = false.
  @Prop({ default: false })
  deveTrocarSenha!: boolean;

  // Aceite dos Termos de Uso (feature-terms-of-service-acceptance).
  // Ausente/null = nunca aceitou. Reaceite obrigatório a cada nova versão do termo.
  @Prop({ type: TermosAceitosSchema })
  termosAceitos?: TermosAceitosMongo;

  // Cópia da marcação `faseTeste` da clínica (teste beta): define que o termo exigido
  // é o Termo de Teste. Ausente em docs antigos = false (Termos de Uso).
  @Prop({ default: false })
  faseTeste!: boolean;

  // Revogação de sessão na troca de senha (feature-session-revocation-on-password-change).
  // Estampado a cada troca de senha bem-sucedida. Ausente = nenhuma troca de senha
  // jamais invalidou sessões deste usuário — NUNCA tratar ausência como rejeição.
  @Prop({ type: Date })
  tokensValidosApartirDe?: Date;
}

export const UserSchema = SchemaFactory.createForClass(UserMongo);
UserSchema.index({ clinicaId: 1, _id: 1 });
