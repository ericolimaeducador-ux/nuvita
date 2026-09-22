import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { PasswordRecoveryTokenTipo } from '../../domain/password-recovery-token.entity';

export type PasswordRecoveryTokenDocument = HydratedDocument<PasswordRecoveryTokenMongo>;

@Schema({ collection: 'password_recovery_tokens', versionKey: false })
export class PasswordRecoveryTokenMongo {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, enum: ['reset', 'login-otp'] })
  tipo!: PasswordRecoveryTokenTipo;

  @Prop({ required: true, unique: true })
  tokenHash!: string;

  // Índice TTL: o Mongo remove o documento sozinho quando expiresAt passa —
  // sem cron, sem job de limpeza.
  @Prop({ required: true, index: { expires: 0 } })
  expiresAt!: Date;

  @Prop({ default: 0 })
  attempts!: number;

  @Prop()
  consumedAt?: Date;
}

export const PasswordRecoveryTokenSchema = SchemaFactory.createForClass(PasswordRecoveryTokenMongo);
