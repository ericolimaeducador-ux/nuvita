import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CriarTicketDto } from './criar-ticket.dto';

/**
 * Bloqueio de campos extras e obrigatoriedade no contrato HTTP de abertura de ticket
 * (feature-tickets-superadmin). Usa o MESMO ValidationPipe configurado em `main.ts`
 * (whitelist + forbidNonWhitelisted + transform).
 */
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

async function validar(corpo: Record<string, unknown>) {
  return pipe.transform(corpo, { type: 'body', metatype: CriarTicketDto });
}

describe('CriarTicketDto', () => {
  it('aceita paciente + justificativa', async () => {
    await expect(validar({ pacienteId: 'paciente-1', justificativa: 'CPF errado' })).resolves.toEqual(
      expect.objectContaining({ pacienteId: 'paciente-1', justificativa: 'CPF errado' }),
    );
  });

  it.each(['status', 'autorId', 'tipo', 'abertoEm', 'clinicaId', 'resolvidoPor'])(
    'campo extra "%s" no corpo → rejeitado (forbidNonWhitelisted)',
    async (campo) => {
      await expect(validar({ pacienteId: 'paciente-1', justificativa: 'CPF errado', [campo]: 'x' })).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('sem pacienteId → rejeitado', async () => {
    await expect(validar({ justificativa: 'CPF errado' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([undefined, '', 123])('justificativa %j → rejeitada', async (justificativa) => {
    await expect(validar({ pacienteId: 'paciente-1', justificativa })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('justificativa acima de 2000 caracteres → rejeitada', async () => {
    await expect(validar({ pacienteId: 'paciente-1', justificativa: 'a'.repeat(2001) })).rejects.toBeInstanceOf(BadRequestException);
  });
});
