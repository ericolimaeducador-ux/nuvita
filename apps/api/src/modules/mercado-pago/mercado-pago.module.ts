import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MercadoPagoController } from './mercado-pago.controller';
import { MercadoPagoService } from './mercado-pago.service';
import { PedidoPagamentoMongo, PedidoPagamentoSchema } from './pedido-pagamento.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: PedidoPagamentoMongo.name, schema: PedidoPagamentoSchema }])],
  controllers: [MercadoPagoController],
  providers: [MercadoPagoService],
})
export class MercadoPagoModule {}
