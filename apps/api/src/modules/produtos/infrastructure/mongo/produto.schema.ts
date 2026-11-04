import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EmbalagemProduto, ProjetoCatalogo, SexoProduto } from '../../domain/produto.entity';

export type ProdutoDocument = HydratedDocument<ProdutoMongo>;

// Catálogo GLOBAL: sem clinicaId (ver domain/produto.entity.ts).
@Schema({ collection: 'produtos', versionKey: false })
export class ProdutoMongo {
  @Prop({ required: true, unique: true, index: true })
  codigo!: number;

  @Prop()
  codigoFabricante?: string;

  @Prop({ required: true, index: true })
  nome!: string;

  // String livre (ver domain/produto.entity.ts): sem enum, para aceitar linhas novas sem mudar código.
  @Prop({ required: true, trim: true, minlength: 1, index: true })
  tipo!: string;

  @Prop({ required: true, enum: Object.values(SexoProduto) })
  sexo!: SexoProduto;

  @Prop({ required: true, enum: Object.values(EmbalagemProduto) })
  embalagem!: EmbalagemProduto;

  @Prop({ required: true, enum: Object.values(ProjetoCatalogo), index: true })
  projeto!: ProjetoCatalogo;

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
