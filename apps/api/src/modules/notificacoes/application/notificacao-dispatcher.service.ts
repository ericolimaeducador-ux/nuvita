import { Inject, Injectable } from '@nestjs/common';
import { NotificacaoSender } from './ports/notificacao-sender';
import { Notificacao } from '../domain/notificacao.entity';

@Injectable()
export class NotificacaoDispatcherService {
  constructor(@Inject('NOTIFICACAO_SENDERS') private readonly senders: NotificacaoSender[]) {}

  async dispatch(notificacao: Notificacao): Promise<void> {
    const sender = this.senders.find((candidate) => candidate.supports(notificacao.canal));
    if (!sender) {
      throw new Error(`No sender configured for channel ${notificacao.canal}.`);
    }

    await sender.send({
      canal: notificacao.canal,
      conteudo: notificacao.conteudo,
    });
  }
}
