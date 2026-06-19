import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EmbalagemProduto, SexoProduto, TipoProduto } from '../../domain/produto.entity';

export type ProdutoDocument = HydratedDocument<ProdutoMongo>;

@Schema({ collection: 'produtos', versionKey: false })
export class ProdutoMongo {
  @Prop({ required: true, unique: true, index: true })
  codigo!: number;

  @Prop({ required: true, index: true })
  nome!: string;

  @Prop({ required: true, enum: Object.values(TipoProduto), index: true })
  tipo!: TipoProduto;

  @Prop({ required: true, enum: Object.values(SexoProduto) })
  sexo!: SexoProduto;

  @Prop({ required: true, enum: Object.values(EmbalagemProduto) })
  embalagem!: EmbalagemProduto;

  @Prop()
  french?: number;

  @Prop()
  comprimentoCm?: number;

  @Prop({ required: true })
  descricaoTecnica!: string;

  @Prop()
  descricaoSiafisico?: string;

  @Prop({ index: true })
  codigoSiafisico?: number;

  @Prop({ default: true, index: true })
  ativo!: boolean;

  @Prop({ default: Date.now, immutable: true })
  criadoEm!: Date;

  @Prop({ default: Date.now })
  atualizadoEm!: Date;
}

export const ProdutoSchema = SchemaFactory.createForClass(ProdutoMongo);
ProdutoSchema.index({ nome: 'text', descricaoTecnica: 'text' });
