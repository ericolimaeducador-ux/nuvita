import { AuditEvent } from './audit-event.enum';

/**
 * Acesso por bracket notation de propósito: os dois valores ainda não existem
 * no enum na fase Red, e `AuditEvent.AI_SUGGESTION_GENERATED` direto seria
 * erro de compilação em vez de asserção falhando.
 */
const evento = (nome: string): string | undefined =>
  (AuditEvent as unknown as Record<string, string>)[nome];

describe('AuditEvent — eventos da trilha de uso de IA', () => {
  it('AI_SUGGESTION_GENERATED existe com valor string estável', () => {
    expect(evento('AI_SUGGESTION_GENERATED')).toBe('AI_SUGGESTION_GENERATED');
  });

  it('AI_SUGGESTION_DECISION_RECORDED existe com valor string estável', () => {
    expect(evento('AI_SUGGESTION_DECISION_RECORDED')).toBe('AI_SUGGESTION_DECISION_RECORDED');
  });
});

describe('AuditEvent — eventos dos auth gates e onboarding de clínica (Fase 3)', () => {
  it('TERMS_ACCEPTED existe com valor string estável', () => {
    expect(evento('TERMS_ACCEPTED')).toBe('TERMS_ACCEPTED');
  });

  it('FORCED_PASSWORD_CHANGED existe com valor string estável', () => {
    expect(evento('FORCED_PASSWORD_CHANGED')).toBe('FORCED_PASSWORD_CHANGED');
  });

  it('CLINIC_CREATED continua existindo (reaproveitado pelo onboarding via UI)', () => {
    expect(evento('CLINIC_CREATED')).toBe('CLINIC_CREATED');
  });
});
