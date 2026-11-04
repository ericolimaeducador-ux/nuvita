import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { SkipThrottle, Throttle, ThrottlerModule } from '@nestjs/throttler';
import { AddressInfo } from 'net';
import { GlobalThrottlerGuard } from './global-throttler.guard';

@Controller()
class RotasDeTeste {
  /** Herda o limite padrão do módulo. */
  @Get('padrao')
  padrao() {
    return { ok: true };
  }

  /** Aperta abaixo do padrão, como fazem /auth/login e /ia-clinica. */
  @Get('apertada')
  @Throttle({ default: { ttl: 60_000, limit: 2 } })
  apertada() {
    return { ok: true };
  }

  /** Fora do throttling, como o /health. */
  @Get('livre')
  @SkipThrottle()
  livre() {
    return { ok: true };
  }
}

describe('GlobalThrottlerGuard', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }])],
      controllers: [RotasDeTeste],
      providers: [{ provide: APP_GUARD, useClass: GlobalThrottlerGuard }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.listen(0);

    const { port } = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  /** Cada teste usa um IP próprio para não herdar o bucket do teste anterior. */
  function get(rota: string, ip: string): Promise<number> {
    return fetch(`${baseUrl}/${rota}`, {
      headers: { 'x-forwarded-for': `203.0.113.9, ${ip}` },
    }).then((r) => r.status);
  }

  async function statusEmSequencia(rota: string, ip: string, vezes: number): Promise<number[]> {
    const status: number[] = [];
    for (let i = 0; i < vezes; i++) {
      status.push(await get(rota, ip));
    }
    return status;
  }

  it('aplica o limite padrão a uma rota que não declara nada — o buraco que motivou o guard global', async () => {
    const status = await statusEmSequencia('padrao', '198.51.100.1', 6);

    expect(status.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(status[5]).toBe(429);
  });

  it('respeita o @Throttle que aperta abaixo do padrão', async () => {
    const status = await statusEmSequencia('apertada', '198.51.100.2', 3);

    expect(status).toEqual([200, 200, 429]);
  });

  it('não limita rota marcada com @SkipThrottle (o /health)', async () => {
    const status = await statusEmSequencia('livre', '198.51.100.3', 8);

    expect(status.every((s) => s === 200)).toBe(true);
  });

  it('separa os buckets por IP', async () => {
    await statusEmSequencia('apertada', '198.51.100.4', 3); // esgota este IP

    // Outro cliente não pode ser punido pelo consumo do primeiro.
    expect(await get('apertada', '198.51.100.5')).toBe(200);
  });

  it('rastreia pela ÚLTIMA entrada de X-Forwarded-For, não pela primeira', async () => {
    // A primeira entrada é controlada pelo cliente: se o tracker olhasse para
    // ela, bastaria variá-la a cada request para nunca bater no limite.
    const url = `${baseUrl}/apertada`;
    const comPrimeiraForjada = (forjado: string) =>
      fetch(url, { headers: { 'x-forwarded-for': `${forjado}, 198.51.100.6` } }).then((r) => r.status);

    expect(await comPrimeiraForjada('1.1.1.1')).toBe(200);
    expect(await comPrimeiraForjada('2.2.2.2')).toBe(200);
    // Terceira tentativa: a primeira entrada mudou de novo, mas a última (o
    // proxy confiável) é a mesma — o limite tem de valer mesmo assim.
    expect(await comPrimeiraForjada('3.3.3.3')).toBe(429);
  });
});
