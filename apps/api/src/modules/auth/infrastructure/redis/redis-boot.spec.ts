import { EventEmitter } from 'events';
import { aguardarRedisPronto } from './redis-boot';

// A API só começa a atender depois de o Redis conectar (a revisão nova não recebe tráfego antes).
const cliente = (status: string) => Object.assign(new EventEmitter(), { status });

describe('aguardarRedisPronto', () => {
  it('já pronto: resolve na hora', async () => {
    await expect(aguardarRedisPronto(cliente('ready') as never, 1_000)).resolves.toBeUndefined();
  });
  it('conecta depois: resolve no evento ready', async () => {
    const c = cliente('connecting');
    const p = aguardarRedisPronto(c as never, 1_000);
    setTimeout(() => c.emit('ready'), 10);
    await expect(p).resolves.toBeUndefined();
  });
  it('não conecta no prazo: rejeita com mensagem clara (o boot falha em vez de atender sem Redis)', async () => {
    await expect(aguardarRedisPronto(cliente('connecting') as never, 30)).rejects.toThrow(/Redis não ficou pronto em 30 ms/);
  });
});
