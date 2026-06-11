import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { EnqueueNotificacaoInput, NotificacaoQueue } from '../../application/ports/notificacao-queue';
import { NOTIFICACAO_QUEUE } from '../../notificacoes.constants';

@Injectable()
export class BullMqNotificacaoQueueService implements NotificacaoQueue {
  constructor(@Inject(NOTIFICACAO_QUEUE) private readonly queue: Queue) {}

  async enqueue(input: EnqueueNotificacaoInput): Promise<void> {
    await this.queue.add(
      'send',
      { notificacaoId: input.notificacaoId },
      {
        delay: input.delayMs ?? 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60_000,
        },
      },
    );
  }
}
