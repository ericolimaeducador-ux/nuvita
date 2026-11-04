import { ServiceUnavailableException } from '@nestjs/common';
import { TokenRevocationService } from './token-revocation.service';

// Redis fora: a revogação continua falhando FECHADA (na dúvida, nega), mas como 503 com mensagem clara, não 500.
const MSG = 'Serviço temporariamente indisponível, tente novamente';
const criar = (redis: Record<string, unknown>) => new TokenRevocationService(redis as never);
const erroRedis = () => Object.assign(new Error('connect ETIMEDOUT'), { code: 'ETIMEDOUT' });

describe('TokenRevocationService — Redis indisponível', () => {
  it('isRevoked: erro do Redis vira 503 com mensagem clara (continua negando)', async () => {
    const service = criar({ exists: jest.fn().mockRejectedValue(erroRedis()) });
    await expect(service.isRevoked('jti-1')).rejects.toThrow(new ServiceUnavailableException(MSG));
  });
  it('revoke (logout e refresh): erro do Redis vira 503 com mensagem clara', async () => {
    const service = criar({ set: jest.fn().mockRejectedValue(erroRedis()) });
    await expect(service.revoke('jti-1', 60)).rejects.toThrow(new ServiceUnavailableException(MSG));
  });
  it('MaxRetriesPerRequestError também vira 503', async () => {
    const service = criar({ exists: jest.fn().mockRejectedValue(new Error('Reached the max retries per request limit (which is 2).')) });
    await expect(service.isRevoked('jti-1')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('Redis saudável: comportamento de sempre', async () => {
    const exists = jest.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    const set = jest.fn().mockResolvedValue('OK');
    const service = criar({ exists, set });
    await expect(service.isRevoked('a')).resolves.toBe(true);
    await expect(service.isRevoked('b')).resolves.toBe(false);
    await service.revoke('a', 60);
    expect(set).toHaveBeenCalledWith('auth:revoked-token:a', '1', 'EX', 60);
  });
});
