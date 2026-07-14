import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import {
  Destreza,
  EncaminhamentoIU,
  LocalAtendimento,
  PerfilCliente,
  TipoIU,
} from '../../domain/avaliacao-iu.entity';

export type AvaliacaoIUDocument = HydratedDocument<AvaliacaoIUMongo>;

@Schema({ collection: 'avaliacoes_iu', versionKey: false })
export class AvaliacaoIUMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, index: true })
  pacienteId!: string;

  @Prop({ required: true, index: true })
  enfermeiroId!: string;

  // Nome do profissional que preencheu, gravado na criação para aparecer na
  // assinatura da ficha impressa sem depender de lookup do usuário.
  @Prop()
  enfermeiroNome?: string;

  @Prop({ index: true })
  agendamentoId?: string;

  @Prop({ required: true, index: true })
  dataAtendimento!: Date;

  @Prop({ required: true, enum: Object.values(LocalAtendimento) })
  local!: LocalAtendimento;

  @Prop()
  prescritor?: string;

  @Prop()
  planoSaude?: string;

  @Prop()
  hospitalReferencia?: string;

  @Prop({ required: true })
  motivoIU!: string;

  @Prop()
  inicioSintomas?: string;

  @Prop({ required: true, enum: Object.values(PerfilCliente) })
  perfilCliente!: PerfilCliente;

  @Prop({ required: true, enum: Object.values(Destreza) })
  destreza!: Destreza;

  @Prop({ required: true })
  dntui!: boolean;

  @Prop({ type: [String], enum: Object.values(TipoIU), default: [] })
  tiposIU!: TipoIU[];

  @Prop({ required: true })
  miccaoEspontanea!: boolean;

  @Prop()
  volumeAproximadoMl?: number;

  @Prop({ required: true })
  realizaCateterismo!: boolean;

  @Prop()
  cateterismosDia?: number;

  @Prop()
  cateterUtilizado?: string;

  @Prop()
  ultimaInfeccaoUrinaria?: string;

  @Prop({ required: true })
  emTratamento!: boolean;

  @Prop()
  tratamento?: string;

  @Prop()
  volumeDrenadoMl?: string;

  @Prop()
  outrasIntercorrencias?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  produtoIndicado?: Record<string, unknown>;

  @Prop()
  responsavelCateterismo?: string;

  @Prop({ required: true, default: false })
  autorizaPesquisa!: boolean;

  @Prop({ required: true, default: false })
  aceitaInformacoes!: boolean;

  @Prop()
  emailContato?: string;

  @Prop()
  whatsappContato?: string;

  @Prop()
  coren?: string;

  @Prop({ enum: Object.values(EncaminhamentoIU) })
  encaminhamento?: EncaminhamentoIU;

  @Prop()
  localEncaminhamento?: string;

  @Prop()
  respCuidador?: string;

  @Prop({ index: true })
  excluidoEm?: Date;

  @Prop()
  excluidoPor?: string;

  @Prop({ default: Date.now, immutable: true, index: true })
  criadoEm!: Date;

  @Prop({ default: Date.now })
  atualizadoEm!: Date;
}

export const AvaliacaoIUSchema = SchemaFactory.createForClass(AvaliacaoIUMongo);
AvaliacaoIUSchema.index({ clinicaId: 1, pacienteId: 1, dataAtendimento: -1 });
AvaliacaoIUSchema.index({ clinicaId: 1, enfermeiroId: 1 });
