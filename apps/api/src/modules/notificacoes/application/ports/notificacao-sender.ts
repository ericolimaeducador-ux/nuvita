import { CanalNotificacao, ConteudoNotificacao } from '../../domain/notificacao.entity';

export interface SendNotificacaoInput {
  canal: CanalNotificacao;
  conteudo: ConteudoNotificacao;
}

export interface NotificacaoSender {
  supports(canal: CanalNotificacao): boolean;
  send(input: SendNotificacaoInput): Promise<void>;
}
