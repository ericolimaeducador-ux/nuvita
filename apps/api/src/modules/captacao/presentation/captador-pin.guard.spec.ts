import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CaptadorPinGuard, pinsCoincidem } from './captador-pin.guard';

function contexto(pin?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: pin === undefined ? {} : { 'x-captador-pin': pin },
      }),
    }),
  } as ExecutionContext;
}

function guard(env: Record<string, string | undefined>): CaptadorPinGuard {
  const config = { get: (key: string) => env[key] } as ConfigService;
  return new CaptadorPinGuard(config);
}

describe('CaptadorPinGuard', () => {
  it('aceita o PIN configurado', () => {
    expect(guard({ PIN_CAPTADOR: '654321', NODE_ENV: 'production' }).canActivate(contexto('654321'))).toBe(true);
  });

  it('recusa PIN errado e header ausente', () => {
    const g = guard({ PIN_CAPTADOR: '654321', NODE_ENV: 'development' });
    expect(() => g.canActivate(contexto('000000'))).toThrow(UnauthorizedException);
    expect(() => g.canActivate(contexto())).toThrow(UnauthorizedException);
  });

  it('em desenvolvimento, sem variável, aceita o fallback 123456', () => {
    expect(guard({ NODE_ENV: 'development' }).canActivate(contexto('123456'))).toBe(true);
  });

  it('em produção, sem PIN_CAPTADOR, recusa qualquer tentativa', () => {
    expect(() => guard({ NODE_ENV: 'production' }).canActivate(contexto('123456'))).toThrow(UnauthorizedException);
  });

  it('pinsCoincidem não quebra quando os tamanhos diferem', () => {
    expect(pinsCoincidem('1234', '123456')).toBe(false);
    expect(pinsCoincidem('123456', '123456')).toBe(true);
  });
});

describe('CaptadorPinGuard — endurecimento', () => {
  it('em staging, sem PIN_CAPTADOR, também recusa (fail-closed)', () => {
    expect(() => guard({ NODE_ENV: 'staging' }).canActivate(contexto('123456'))).toThrow(UnauthorizedException);
  });

  it('PIN_CAPTADOR em branco em produção recusa, mesmo com o fallback 123456', () => {
    expect(() => guard({ PIN_CAPTADOR: '   ', NODE_ENV: 'production' }).canActivate(contexto('123456'))).toThrow(
      UnauthorizedException,
    );
  });

  it('com PIN configurado, o fallback 123456 NÃO é aceito', () => {
    expect(() => guard({ PIN_CAPTADOR: '654321', NODE_ENV: 'development' }).canActivate(contexto('123456'))).toThrow(
      UnauthorizedException,
    );
  });

  it('aceita o header como array (usa o primeiro valor)', () => {
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ headers: { 'x-captador-pin': ['654321', 'x'] } }) }),
    } as ExecutionContext;
    expect(guard({ PIN_CAPTADOR: '654321' }).canActivate(ctx)).toBe(true);
  });

  it('a comparação usa timingSafeEqual, inclusive quando os tamanhos diferem', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const spy = jest.spyOn(require('crypto'), 'timingSafeEqual');
    pinsCoincidem('123456', '123456');
    pinsCoincidem('1', '123456');
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});
