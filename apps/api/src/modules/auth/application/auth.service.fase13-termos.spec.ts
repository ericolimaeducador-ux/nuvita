/**
 * Fase 13 — sinal `terms_source_unavailable` (§11 do TDD).
 *
 * A versão vigente dos Termos vem de uma constante compartilhada
 * (`packages/shared/src/termos`). Se ela resolver para vazio no runtime
 * (build quebrado, import corrompido), o gate de aceite não tem como validar
 * nenhuma versão — fail-closed. Aqui forçamos esse estado via mock do módulo
 * e verificamos que `aceitarTermos` emite o evento estruturado de erro.
 *
 * Módulos são importados dinamicamente DEPOIS do `jest.resetModules()` para
 * que AuthService e o `Logger` espionado venham do mesmo registro de módulos
 * onde o mock da constante está ativo.
 */
describe('AuthService.aceitarTermos — terms_source_unavailable (Fase 13)', () => {
  afterEach(() => {
    jest.dontMock('../../../../../../packages/shared/src/termos');
    jest.dontMock('bcrypt');
    jest.resetModules();
  });

  it('constante de versão vazia → error terms_source_unavailable e rejeita', async () => {
    jest.resetModules();
    jest.doMock('../../../../../../packages/shared/src/termos', () => ({
      TERMOS_DE_USO_VERSAO_ATUAL: '',
      TERMOS_DE_USO_VIGENCIA: '',
      TERMO_DE_TESTE_VERSAO_ATUAL: '',
      versaoTermosExigida: () => '',
    }));
    jest.doMock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));

    const { Logger, ServiceUnavailableException } = await import('@nestjs/common');
    const { AuthService } = await import('./auth.service');

    const errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    const service = new AuthService(
      // Usuário ativo: a versão exigida depende da fase de teste dele, então o
      // aceite carrega o usuário antes de validar a versão.
      { findById: jest.fn().mockResolvedValue({ id: 'u1', ativo: true, faseTeste: false }) } as never,
      { create: jest.fn() } as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.aceitarTermos('u1', 'qualquer-coisa', { ip: '127.0.0.1', userAgent: 'jest' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    const payloads = errorSpy.mock.calls.map((c) => JSON.parse(c[0] as string));
    expect(payloads).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'error',
          event: 'terms_source_unavailable',
          userId: 'u1',
        }),
      ]),
    );

    errorSpy.mockRestore();
  });
});
