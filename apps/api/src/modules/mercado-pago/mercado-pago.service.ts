import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomUUID } from 'crypto';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import { Model } from 'mongoose';
import { assinaturaWebhookValida } from './assinatura-webhook';
import { PedidoPagamentoDocument, PedidoPagamentoMongo } from './pedido-pagamento.schema';
import { PLANOS, type PlanoId } from './planos';

export interface EntradaWebhook {
  query: Record<string, unknown>;
  body: unknown;
  xSignature?: string;
  xRequestId?: string;
}

/** Só o necessário de um erro do SDK: nunca serializa o objeto inteiro (pode conter config/headers). */
function erroSeguro(err: unknown): { mensagem: string; status?: number } {
  const e = err as { message?: string; status?: number };
  return { mensagem: typeof e?.message === 'string' ? e.message : 'erro desconhecido', status: e?.status };
}

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private cliente: MercadoPagoConfig | null = null;

  constructor(
    @InjectModel(PedidoPagamentoMongo.name) private readonly pedidos: Model<PedidoPagamentoDocument>,
  ) {}

  /** Access Token só via variável de ambiente; nunca é logado nem devolvido. */
  private obterCliente(): MercadoPagoConfig {
    if (this.cliente) return this.cliente;
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      this.logger.error('MERCADO_PAGO_ACCESS_TOKEN não configurado');
      throw new ServiceUnavailableException('Pagamento indisponível no momento');
    }
    this.cliente = new MercadoPagoConfig({ accessToken, options: { timeout: 10_000 } });
    return this.cliente;
  }

  /** Cria a preferência de pagamento e devolve SOMENTE o id dela. */
  async criarPreferencia(planoId: PlanoId): Promise<{ id: string }> {
    const plano = PLANOS[planoId];
    const cliente = this.obterCliente();
    const externalReference = randomUUID();

    // Registra o pedido antes de chamar o Mercado Pago, para o webhook sempre achar o pedido.
    await this.pedidos.create({ externalReference, plano: plano.id, valor: plano.valor, status: 'pendente' });

    try {
      const notificationUrl = process.env.MERCADO_PAGO_NOTIFICATION_URL;
      const preferencia = await new Preference(cliente).create({
        body: {
          items: [
            { id: plano.id, title: plano.titulo, quantity: 1, unit_price: plano.valor, currency_id: 'BRL' },
          ],
          external_reference: externalReference,
          statement_descriptor: 'NUVITA',
          payment_methods: {
            excluded_payment_types: plano.meiosDePagamento.excluidos,
            installments: plano.meiosDePagamento.parcelasMaximas,
            default_installments: plano.meiosDePagamento.parcelasPadrao,
          },
          ...(notificationUrl ? { notification_url: notificationUrl } : {}),
        },
      });

      if (!preferencia.id) throw new Error('resposta sem id de preferência');
      await this.pedidos.updateOne({ externalReference }, { preferenciaId: preferencia.id });
      this.logger.log(JSON.stringify({ evento: 'mp_preferencia_criada', plano: plano.id, externalReference }));
      return { id: preferencia.id };
    } catch (err) {
      await this.pedidos.updateOne({ externalReference }, { status: 'preferencia_falhou' }).catch(() => undefined);
      this.logger.error(JSON.stringify({ evento: 'mp_preferencia_erro', plano: plano.id, ...erroSeguro(err) }));
      throw new BadGatewayException('Não foi possível iniciar o pagamento');
    }
  }

  /**
   * Notificação do Mercado Pago. Nunca confia no payload: valida a assinatura (quando há
   * segredo) e SEMPRE consulta o pagamento real na API. Só registra; não libera acesso.
   */
  async processarWebhook(entrada: EntradaWebhook): Promise<{ recebido: true; registrado: boolean }> {
    const body = (entrada.body ?? {}) as { type?: string; data?: { id?: string | number }; id?: string | number };
    const tipo = String(entrada.query.type ?? body.type ?? entrada.query.topic ?? '');
    if (tipo !== 'payment') return { recebido: true, registrado: false };

    const dataId = String(entrada.query['data.id'] ?? body.data?.id ?? entrada.query.id ?? body.id ?? '');
    if (!dataId) return { recebido: true, registrado: false };

    this.validarAssinatura(entrada, dataId);

    const cliente = this.obterCliente(); // 503 claro se o token não estiver configurado
    let pagamento;
    try {
      pagamento = await new Payment(cliente).get({ id: dataId });
    } catch (err) {
      const { mensagem, status } = erroSeguro(err);
      // Pagamento inexistente (ex.: notificação de simulação): não vale retentar.
      if (status === 404 || status === 400) {
        this.logger.warn(JSON.stringify({ evento: 'mp_webhook_pagamento_inexistente', pagamentoId: dataId, status }));
        return { recebido: true, registrado: false };
      }
      this.logger.error(JSON.stringify({ evento: 'mp_webhook_consulta_erro', pagamentoId: dataId, mensagem, status }));
      throw new BadGatewayException('Falha ao consultar o pagamento'); // 5xx => o Mercado Pago retenta
    }

    const externalReference = pagamento.external_reference ?? undefined;
    const pedido = externalReference ? await this.pedidos.findOne({ externalReference }) : null;
    if (!pedido) {
      // Ex.: pagamento feito pelos links diretos (sem preferência nossa). Só log.
      this.logger.warn(
        JSON.stringify({ evento: 'mp_webhook_pedido_desconhecido', pagamentoId: dataId, status: pagamento.status, externalReference }),
      );
      return { recebido: true, registrado: false };
    }

    const valorPago = pagamento.transaction_amount ?? undefined;
    const divergenciaValor = valorPago !== undefined && Math.abs(valorPago - pedido.valor) > 0.009;
    await this.pedidos.updateOne(
      { externalReference },
      {
        status: pagamento.status ?? 'desconhecido',
        statusDetalhe: pagamento.status_detail,
        pagamentoId: String(pagamento.id ?? dataId),
        metodoPagamento: pagamento.payment_method_id,
        valorPago,
        divergenciaValor,
        aprovadoEm: pagamento.date_approved ? new Date(pagamento.date_approved) : undefined,
        ultimaNotificacaoEm: new Date(),
      },
    );
    this.logger.log(
      JSON.stringify({
        evento: 'mp_pagamento_registrado',
        externalReference,
        plano: pedido.plano,
        pagamentoId: dataId,
        status: pagamento.status,
        valorEsperado: pedido.valor,
        valorPago,
        divergenciaValor,
      }),
    );
    return { recebido: true, registrado: true };
  }

  private validarAssinatura(entrada: EntradaWebhook, dataId: string): void {
    const segredo = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    if (!segredo) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('MERCADO_PAGO_WEBHOOK_SECRET ausente em produção: webhook recusado');
        throw new ServiceUnavailableException();
      }
      this.logger.warn('MERCADO_PAGO_WEBHOOK_SECRET ausente: assinatura não verificada (só fora de produção)');
      return;
    }
    const valida = assinaturaWebhookValida({
      segredo,
      xSignature: entrada.xSignature,
      xRequestId: entrada.xRequestId,
      dataId,
    });
    if (!valida) {
      this.logger.warn(JSON.stringify({ evento: 'mp_webhook_assinatura_invalida', pagamentoId: dataId }));
      throw new UnauthorizedException();
    }
  }
}
