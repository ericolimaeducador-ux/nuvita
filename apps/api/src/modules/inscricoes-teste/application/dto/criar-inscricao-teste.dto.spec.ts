import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CriarInscricaoTesteDto } from './criar-inscricao-teste.dto';

const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
const validar = (corpo: Record<string, unknown>) => pipe.transform(corpo, { type: 'body', metatype: CriarInscricaoTesteDto });

const valido = {
  nome: 'Ana Souza',
  email: 'Ana@Exemplo.com ',
  whatsapp: '(11) 99999-8888',
  crpNumero: '06/12345',
  cidadeEstado: 'São Paulo, SP',
  modoAtendimento: 'Online',
  termoVersao: 'teste-beta-v1-2026-10',
  aceiteTermo: true,
  aceitePrivacidade: true,
};

describe('CriarInscricaoTesteDto', () => {
  it('aceita inscrição válida e normaliza o e-mail', async () => {
    await expect(validar(valido)).resolves.toEqual(expect.objectContaining({ email: 'ana@exemplo.com' }));
  });

  it.each(['status', 'criadoEm', 'aceiteIp', 'id', 'clinicaId', 'pacienteId'])('campo extra "%s" → rejeitado', async (campo) => {
    await expect(validar({ ...valido, [campo]: 'x' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(['nome', 'email', 'whatsapp', 'crpNumero', 'cidadeEstado', 'modoAtendimento', 'termoVersao'])('sem "%s" → rejeitado', async (campo) => {
    const { [campo]: _omitido, ...resto } = valido as Record<string, unknown>;
    await expect(validar(resto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([false, undefined, 'true', 1])('aceiteTermo %j → rejeitado', async (aceiteTermo) => {
    await expect(validar({ ...valido, aceiteTermo })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('aceitePrivacidade falso → rejeitado', async () => {
    await expect(validar({ ...valido, aceitePrivacidade: false })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('e-mail inválido e modo de atendimento fora da lista → rejeitados', async () => {
    await expect(validar({ ...valido, email: 'sem-arroba' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(validar({ ...valido, modoAtendimento: 'Outro' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('texto livre acima de 500 caracteres → rejeitado', async () => {
    await expect(validar({ ...valido, maiorDor: 'a'.repeat(501) })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('aceita o campo-armadilha "website" (o serviço é quem descarta)', async () => {
    await expect(validar({ ...valido, website: 'http://spam' })).resolves.toBeDefined();
  });
});
