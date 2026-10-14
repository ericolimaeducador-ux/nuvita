import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { InscricaoTesteStatus } from '../../domain/inscricao-teste.entity';

export type InscricaoTesteDocument = HydratedDocument<InscricaoTesteMongo>;

/**
 * Dados pessoais de PROFISSIONAIS (nome, e-mail, WhatsApp, CRP) — não de pacientes.
 * Em produção o autoIndex fica desligado (app.module.ts): o índice único de `email`
 * precisa ser criado uma vez por migração/ops (ver docs/runbooks/inscricoes-teste.md).
 */
@Schema({ collection: 'inscricoes_teste', versionKey: false })
export class InscricaoTesteMongo {
  @Prop({ required: true, immutable: true })
  nome!: string;

  @Prop({ required: true, immutable: true, unique: true, index: true })
  email!: string;

  @Prop({ required: true, immutable: true })
  whatsapp!: string;

  @Prop({ required: true, immutable: true })
  crpNumero!: string;

  @Prop({ required: true, immutable: true })
  cidadeEstado!: string;

  @Prop({ required: true, immutable: true })
  modoAtendimento!: string;

  @Prop({ immutable: true })
  ferramentaAtual?: string;

  @Prop({ immutable: true })
  maiorDor?: string;

  // Prova do aceite: versão do termo, momento, IP e navegador.
  @Prop({ required: true, immutable: true })
  termoVersao!: string;

  @Prop({ required: true, immutable: true })
  aceiteTermoEm!: Date;

  @Prop({ required: true, immutable: true })
  aceiteIp!: string;

  @Prop({ immutable: true })
  aceiteUserAgent?: string;

  @Prop({ required: true, enum: Object.values(InscricaoTesteStatus), default: InscricaoTesteStatus.INSCRITA, index: true })
  status!: InscricaoTesteStatus;

  @Prop({ required: true, immutable: true, default: () => new Date() })
  criadoEm!: Date;
}

export const InscricaoTesteSchema = SchemaFactory.createForClass(InscricaoTesteMongo);
