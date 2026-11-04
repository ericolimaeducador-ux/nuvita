import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TestePsicologicoDocument = HydratedDocument<TestePsicologicoMongo>;

// Esqueleto de testes psicológicos aplicados — sem catálogo de testes ainda
// (nomeTeste é texto livre digitado pelo psicólogo). Estrutura pronta para
// receber um catálogo/pontuação padronizados numa fase futura.
@Schema({ collection: 'testes_psicologicos', versionKey: false })
export class TestePsicologicoMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, index: true })
  pacienteId!: string;

  @Prop({ required: true, trim: true })
  nomeTeste!: string;

  @Prop({ required: true })
  dataAplicacao!: Date;

  @Prop()
  resultado?: string;

  @Prop({ required: true })
  aplicadoPor!: string;

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;
}

export const TestePsicologicoSchema = SchemaFactory.createForClass(TestePsicologicoMongo);
TestePsicologicoSchema.index({ clinicaId: 1, pacienteId: 1, dataAplicacao: -1 });

// Registro de teste psicológico aplicado é evidência clínica do atendimento
// — mesmo padrão de append-only já aplicado a observacoes-paciente e
// prontuarios: nunca update/delete, só criação. (Se houver exigência
// normativa específica do CFP para este tipo de registro, precisa ser
// verificada em fonte oficial antes de virar regra documentada — aqui é
// só consistência de engenharia com o padrão já adotado no projeto.) Sem
// isso, um resultado de teste poderia ser silenciosamente sobrescrito ou
// apagado sem deixar rastro, mesmo sem nenhum endpoint de update/delete
// exposto hoje (defesa em profundidade contra migração/admin futuro).
const rejectMutation = () => {
  throw new Error('Teste psicologico e append-only.');
};
TestePsicologicoSchema.pre('updateOne', rejectMutation);
TestePsicologicoSchema.pre('updateMany', rejectMutation);
TestePsicologicoSchema.pre('findOneAndUpdate', rejectMutation);
TestePsicologicoSchema.pre('deleteOne', rejectMutation);
TestePsicologicoSchema.pre('deleteMany', rejectMutation);
TestePsicologicoSchema.pre('findOneAndDelete', rejectMutation);
