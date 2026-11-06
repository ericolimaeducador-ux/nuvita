import 'reflect-metadata';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { AppModule } from './app.module';
import { MATRIZ_API } from './common/security/authorization-matrix.expected';
import { TestesPsicologicosModule } from './modules/testes-psicologicos/testes-psicologicos.module';

/**
 * R1.4 — módulos herdados do psi DESLIGADOS no app (o código fica no repositório; as rotas deixam de existir).
 * Nenhum dado é tocado.
 */
describe('R1.4 — módulos herdados do psi fora do app', () => {
  const importados = (Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule) ?? []) as unknown[];

  it('testes-psicologicos não é registrado no AppModule', () => {
    expect(importados).not.toContain(TestesPsicologicosModule);
  });

  it('a matriz não declara mais rotas de testes-psicologicos', () => {
    expect(Object.keys(MATRIZ_API).filter((r) => r.includes('/testes-psicologicos'))).toEqual([]);
  });
});
