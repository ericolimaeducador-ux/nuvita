import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { LesaoRepository, MudancaStatusLesao, NovaLesao } from '../../application/ports/lesao.repository';
import { ConsentimentoImagem, CorrecaoLesao, IdentificacaoLesao, Lesao } from '../../domain/lesao.entity';
import { ConsentimentoImagemDocument, ConsentimentoImagemMongo, LesaoDocument, LesaoMongo } from './lesao.schema';

@Injectable()
export class LesaoMongoRepository implements LesaoRepository {
  constructor(
    @InjectModel(LesaoMongo.name) private readonly lesoes: Model<LesaoDocument>,
    @InjectModel(ConsentimentoImagemMongo.name) private readonly consentimentos: Model<ConsentimentoImagemDocument>,
  ) {}

  async create(data: NovaLesao): Promise<Lesao> {
    const doc = await this.lesoes.create({ ...data, status: 'ABERTA', correcoes: [], versao: 1 });
    return this.comId<Lesao>(doc.toObject() as unknown as Record<string, unknown>);
  }

  async ultimoNumero(clinicaId: string, pacienteId: string): Promise<number> {
    const ultimo = await this.lesoes.findOne({ clinicaId, pacienteId }).sort({ numero: -1 }).lean();
    return ultimo?.numero ?? 0;
  }

  async findById(clinicaId: string, id: string): Promise<Lesao | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await this.lesoes.findOne({ _id: id, clinicaId }).lean();
    return doc ? this.comId<Lesao>(doc) : null;
  }

  async listByPaciente(clinicaId: string, pacienteId: string): Promise<Lesao[]> {
    const docs = await this.lesoes.find({ clinicaId, pacienteId }).sort({ numero: 1 }).lean();
    return docs.map((d) => this.comId<Lesao>(d));
  }

  async corrigir(clinicaId: string, id: string, versaoEsperada: number, identificacao: IdentificacaoLesao, correcao: CorrecaoLesao): Promise<Lesao | null> {
    if (!isValidObjectId(id)) return null;
    // Campos condicionais ausentes na correção são REMOVIDOS da lesão ($unset), não herdados da versão anterior.
    const unset: Record<string, 1> = {};
    if (identificacao.subtipoUmidade === undefined) unset.subtipoUmidade = 1;
    if (identificacao.etiologiaOutra === undefined) unset.etiologiaOutra = 1;
    const doc = await this.lesoes
      .findOneAndUpdate(
        { _id: id, clinicaId, versao: versaoEsperada },
        {
          $set: { ...Object.fromEntries(Object.entries(identificacao).filter(([, v]) => v !== undefined)), atualizadaEm: new Date() },
          ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
          $push: { correcoes: correcao },
          $inc: { versao: 1 },
        },
        { new: true },
      )
      .lean();
    return doc ? this.comId<Lesao>(doc) : null;
  }

  async alterarStatus(clinicaId: string, id: string, m: MudancaStatusLesao): Promise<Lesao | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await this.lesoes
      .findOneAndUpdate(
        { _id: id, clinicaId, status: 'ABERTA' },
        {
          $set: {
            status: m.status,
            ...(m.motivoEncerramento ? { motivoEncerramento: m.motivoEncerramento } : {}),
            statusConsultaId: m.consultaId,
            statusAlteradoEm: m.em,
            statusAlteradoPor: m.por,
            atualizadaEm: new Date(),
          },
        },
        { new: true },
      )
      .lean();
    return doc ? this.comId<Lesao>(doc) : null;
  }

  async createConsentimento(data: Omit<ConsentimentoImagem, 'id' | 'criadoEm' | 'revogadoEm' | 'revogadoPor'>): Promise<ConsentimentoImagem> {
    const doc = await this.consentimentos.create({ ...data, revogadoEm: null, revogadoPor: null });
    return this.comId<ConsentimentoImagem>(doc.toObject() as unknown as Record<string, unknown>);
  }

  async consentimentoVigente(clinicaId: string, pacienteId: string): Promise<ConsentimentoImagem | null> {
    const doc = await this.consentimentos.findOne({ clinicaId, pacienteId, revogadoEm: null }).sort({ criadoEm: -1 }).lean();
    return doc ? this.comId<ConsentimentoImagem>(doc) : null;
  }

  async listConsentimentos(clinicaId: string, pacienteId: string): Promise<ConsentimentoImagem[]> {
    const docs = await this.consentimentos.find({ clinicaId, pacienteId }).sort({ criadoEm: -1, _id: -1 }).lean();
    return docs.map((d) => this.comId<ConsentimentoImagem>(d));
  }

  async revogarConsentimento(clinicaId: string, id: string, por: string, em: Date): Promise<ConsentimentoImagem | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await this.consentimentos
      .findOneAndUpdate({ _id: id, clinicaId, revogadoEm: null }, { $set: { revogadoEm: em, revogadoPor: por } }, { new: true })
      .lean();
    return doc ? this.comId<ConsentimentoImagem>(doc) : null;
  }

  private comId<T>(doc: Record<string, unknown>): T {
    const { _id, ...rest } = doc as Record<string, unknown> & { _id: { toString(): string } };
    return { id: _id.toString(), ...rest } as T;
  }
}
