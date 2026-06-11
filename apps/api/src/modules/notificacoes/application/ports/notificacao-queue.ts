export interface EnqueueNotificacaoInput {
  notificacaoId: string;
  delayMs?: number;
}

export interface NotificacaoQueue {
  enqueue(input: EnqueueNotificacaoInput): Promise<void>;
}
