import { AgendamentoSchema } from './agendamento.schema';

/**
 * feature-consultation-reminder-scheduler: campos de idempotência
 * lembrete24hEnviadoEm / lembrete1hEnviadoEm no Agendamento schema.
 * Mesmo padrão de tokensValidosApartirDe (auth): ausência nunca pode
 * significar "já enviado" nem travar nada — por isso sem default e
 * sem required. Migração aditiva: agendamentos existentes nascem sem
 * os campos.
 */
describe('agendamento schema — campos de idempotência dos lembretes', () => {
  it('lembrete24hEnviadoEm existe como campo Date', () => {
    const path = AgendamentoSchema.path('lembrete24hEnviadoEm');
    expect(path).toBeDefined();
    expect(path.instance).toBe('Date');
  });

  it('lembrete1hEnviadoEm existe como campo Date', () => {
    const path = AgendamentoSchema.path('lembrete1hEnviadoEm');
    expect(path).toBeDefined();
    expect(path.instance).toBe('Date');
  });

  it('lembrete24hEnviadoEm é opcional e sem default (ausência não pode virar um valor)', () => {
    const path = AgendamentoSchema.path('lembrete24hEnviadoEm');
    expect(path.options.required).toBeFalsy();
    expect(path.options.default).toBeUndefined();
  });

  it('lembrete1hEnviadoEm é opcional e sem default (ausência não pode virar um valor)', () => {
    const path = AgendamentoSchema.path('lembrete1hEnviadoEm');
    expect(path.options.required).toBeFalsy();
    expect(path.options.default).toBeUndefined();
  });
});
