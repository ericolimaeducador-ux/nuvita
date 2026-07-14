import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { StatusLaudoMedico } from '../../domain/laudo-medico.entity';

export type LaudoMedicoDocument = HydratedDocument<LaudoMedicoMongo>;

@Schema({ _id: false, versionKey: false })
class AssinaturaLaudoMongo {
  @Prop({ required: true })
  medicoId!: string;

  @Prop()
  crmNumero?: string;

  @Prop({ required: true })
  dataAssinatura!: Date;

  @Prop({ required: true })
  hash!: string;
}

@Schema({ _id: false, versionKey: false })
class CateterExternoConfigMongo {
  @Prop({ required: true })
  incluirDescricaoTecnica!: boolean;

  @Prop({ required: true })
  incluirCodigoSiafisico!: boolean;
}

@Schema({ collection: 'laudos_medicos', versionKey: false })
export class LaudoMedicoMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, index: true })
  pacienteId!: string;

  @Prop({ index: true })
  medicoId?: string;

  @Prop({ required: true, index: true })
  criadoPorId!: string;

  @Prop()
  criadoPorNome?: string;

  @Prop({ required: true })
  criadoPorPapel!: string;

  @Prop({ required: true, enum: StatusLaudoMedico, default: StatusLaudoMedico.RASCUNHO, index: true })
  status!: StatusLaudoMedico;

  @Prop({ required: true, index: true })
  avaliacaoIuId!: string;

  @Prop({ required: true, index: true })
  dataLaudo!: Date;

  @Prop({ type: [String], default: [] })
  cid10!: string[];

  @Prop()
  contextoSocial?: string;

  @Prop({ required: true })
  etiologia!: string;

  @Prop()
  nivelLesao?: string;

  @Prop({ required: true })
  diagnosticoFuncional!: string;

  @Prop({ required: true })
  regimeCil!: string;

  @Prop({ required: true })
  insumoAtual!: string;

  @Prop()
  fornecedorAtual?: string;

  @Prop({ required: true })
  riscoEsvaziamento!: boolean;

  @Prop({ required: true })
  riscoItuAtual!: boolean;

  @Prop({ required: true })
  riscoAntibioticoterapia!: boolean;

  @Prop({ required: true })
  riscoTratoSuperior!: boolean;

  @Prop({ required: true })
  riscoInsuficienciaRenal!: boolean;

  @Prop({ required: true })
  riscoLesaoUretral!: boolean;

  @Prop({ required: true })
  riscoPerdasNoturnas!: boolean;

  @Prop({ required: true })
  deficienciaLubrificacao!: boolean;

  @Prop({ required: true })
  deficienciaPontaProtetora!: boolean;

  @Prop({ required: true })
  deficienciaMangaProtetora!: boolean;

  @Prop({ required: true })
  deficienciaDor!: boolean;

  @Prop({ required: true })
  deficienciaAlergiaLidocaina!: boolean;

  @Prop({ required: true })
  deficienciaFrascoReutilizado!: boolean;

  @Prop({ required: true })
  deficienciaRiscoInternacao!: boolean;

  @Prop({ required: true })
  prescricaoIncluirCodigoFabricante!: boolean;

  @Prop({ required: true })
  prescricaoEmbalagemPocket!: boolean;

  @Prop({ required: true })
  prescricaoClausulaMarca!: boolean;

  @Prop({ required: true })
  prescricaoCateterExterno!: boolean;

  @Prop({ required: true })
  prescricaoIncluirObjetivo!: boolean;

  @Prop({ required: true })
  prescricaoIncluirConclusao!: boolean;

  @Prop({ type: SchemaFactory.createForClass(CateterExternoConfigMongo) })
  cateterExterno?: CateterExternoConfigMongo;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  produtosSolicitados!: Record<string, unknown>[];

  @Prop({ enum: ['speedicath', 'gentlecath'] })
  comparativoAnvisa?: 'speedicath' | 'gentlecath';

  @Prop()
  medicoNomeExibicao?: string;

  @Prop()
  medicoEspecialidade?: string;

  @Prop()
  crmExibicao?: string;

  @Prop()
  cidadeEmissao?: string;

  @Prop({ type: SchemaFactory.createForClass(AssinaturaLaudoMongo) })
  assinado?: AssinaturaLaudoMongo;

  @Prop({ index: true })
  excluidoEm?: Date;

  @Prop()
  excluidoPor?: string;

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;

  @Prop({ default: Date.now })
  atualizadoEm!: Date;
}

export const LaudoMedicoSchema = SchemaFactory.createForClass(LaudoMedicoMongo);
LaudoMedicoSchema.index({ clinicaId: 1, pacienteId: 1, dataLaudo: -1 });
LaudoMedicoSchema.index({ clinicaId: 1, status: 1 });

function rejectDelete(next: (error?: Error) => void): void {
  next(new Error('Laudos médicos têm retenção obrigatória e não podem ser deletados.'));
}

LaudoMedicoSchema.pre('deleteOne', rejectDelete);
LaudoMedicoSchema.pre('deleteMany', rejectDelete);
LaudoMedicoSchema.pre('findOneAndDelete', rejectDelete);
