import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { LinhaTerapeutica, ProjetoPaciente, Sexo } from '../../domain/paciente.entity';

export type PacienteDocument = HydratedDocument<PacienteMongo>;

@Schema({ _id: false, versionKey: false })
export class ConsentimentoLGPDMongo {
  @Prop({ required: true })
  aceito!: boolean;

  @Prop({ required: true })
  dataAceite!: Date;

  @Prop({ required: true })
  versao!: string;
}

const ConsentimentoLGPDSchema = SchemaFactory.createForClass(ConsentimentoLGPDMongo);

@Schema({ _id: false, versionKey: false })
export class AutorizacaoResponsavelMongo {
  @Prop({ required: true, default: false })
  confirmado!: boolean;

  // Quem confirmou (context.user.sub) e quando — não reescrito num PATCH que
  // não toca em autorizacaoResponsavel (ver PacientesService.update()): fica
  // como o registro histórico de QUANDO a autorização foi de fato confirmada.
  @Prop()
  registradaPor?: string;

  @Prop()
  registradaEm?: Date;
}

const AutorizacaoResponsavelSchema = SchemaFactory.createForClass(AutorizacaoResponsavelMongo);

// Versão anterior de uma correção de identidade (feature-correcao-identidade-paciente).
// `dados` é um blob criptografado (AES-256-GCM, mesma chave/serviço dos demais
// campos sensíveis) com { anterior, novo, justificativa } — valores antigos/novos
// e a justificativa livre NUNCA aparecem em claro nem na trilha de auditoria.
@Schema({ _id: false, versionKey: false })
export class VersaoIdentidadeMongo {
  @Prop({ type: [String], required: true })
  campos!: string[];

  @Prop({ required: true })
  dados!: string;

  @Prop({ required: true })
  solicitadoPor!: string;

  @Prop()
  ticketId?: string;

  @Prop({ required: true })
  executadoPor!: string;

  @Prop({ required: true })
  executadoEm!: Date;
}

const VersaoIdentidadeSchema = SchemaFactory.createForClass(VersaoIdentidadeMongo);

@Schema({ collection: 'pacientes', versionKey: false })
export class PacienteMongo {
  @Prop({ required: true, index: true })
  clinicaId!: string;

  @Prop({ required: true, trim: true, index: true })
  nome!: string;

  @Prop()
  cpf?: string;

  @Prop({ index: true })
  cpfHash?: string;

  @Prop()
  dataNascimento?: Date;

  @Prop({ enum: Object.values(Sexo), index: true })
  sexo?: Sexo;

  @Prop()
  telefone?: string;

  @Prop()
  email?: string;

  @Prop()
  endereco?: string;

  @Prop()
  convenio?: string;

  @Prop({ type: ConsentimentoLGPDSchema })
  consentimentoLGPD?: ConsentimentoLGPDMongo;

  @Prop({ enum: Object.values(ProjetoPaciente), index: true })
  projeto?: ProjetoPaciente;

  @Prop({ enum: Object.values(LinhaTerapeutica), index: true })
  linhaTerapeutica?: LinhaTerapeutica;

  // Quem indicou o paciente — não criptografado (mesmo racional de `projeto`)
  // para permitir filtro/agregação e autocomplete por valores já usados.
  @Prop({ trim: true, index: true })
  representante?: string;

  // JSON criptografado (mesmo padrão de endereco/convenio, um único blob para o
  // subdocumento inteiro) — inclui nome/cpf/telefone/email do responsável, todos
  // dados pessoais sensíveis. Sem índice para o CPF do responsável (diferente do
  // cpfHash do paciente): um mesmo responsável pode ter vários pacientes
  // vinculados, e não há hoje um caso de uso de busca por CPF do responsável
  // que justifique manter um índice (nem único, nem não-único) sobre esse dado.
  @Prop()
  responsavelLegal?: string;

  // Não criptografado (mesmo padrão de consentimentoLGPD) — não é dado pessoal do
  // responsável, é o registro operacional de QUEM/QUANDO autorizou.
  @Prop({ type: AutorizacaoResponsavelSchema })
  autorizacaoResponsavel?: AutorizacaoResponsavelMongo;

  // Texto livre, criptografado (mesmo padrão de telefone/email/endereco) —
  // qualquer profissional de atendimento pode escrever, ver PATCH /observacoes.
  @Prop()
  observacoes?: string;

  // Histórico append-only das correções de identidade. select:false — fica fora de
  // qualquer leitura normal (lista, detalhe, export LGPD) e só sai por consulta
  // explícita; gravado exclusivamente por PacienteMongoRepository.corrigirIdentidade().
  @Prop({ type: [VersaoIdentidadeSchema], default: undefined, select: false })
  versoesIdentidade?: VersaoIdentidadeMongo[];

  @Prop({ default: true, index: true })
  ativo!: boolean;

  @Prop({ default: Date.now, immutable: true, index: true })
  criadoEm!: Date;

  @Prop({ default: Date.now, index: true })
  atualizadoEm!: Date;
}

export const PacienteSchema = SchemaFactory.createForClass(PacienteMongo);

PacienteSchema.index({ clinicaId: 1, _id: 1 });
// `sparse` não basta aqui: em índice COMPOSTO o Mongo só pula o doc quando
// TODOS os campos estão ausentes, e clinicaId sempre existe — então todo
// paciente sem CPF entrava no índice com cpfHash:null e o 2º colidia.
// Índice parcial exige cpfHash realmente presente (string), como pretendido.
PacienteSchema.index(
  { clinicaId: 1, cpfHash: 1 },
  { unique: true, partialFilterExpression: { cpfHash: { $type: 'string' } } },
);
PacienteSchema.index({ clinicaId: 1, ativo: 1, criadoEm: -1, _id: -1 });
PacienteSchema.index({ clinicaId: 1, representante: 1 });
