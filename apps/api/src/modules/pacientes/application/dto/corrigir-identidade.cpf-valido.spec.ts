import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CorrigirIdentidadePacienteDto } from './corrigir-identidade-paciente.dto';

// A correção de identidade do super-admin também confere o dígito verificador do CPF (antes só o formato).
const erros = async (over: Record<string, unknown>) =>
  (await validate(plainToInstance(CorrigirIdentidadePacienteDto, { justificativa: 'CPF digitado errado', ...over }), { whitelist: true, forbidNonWhitelisted: true })).map((e) => e.property);

describe('CorrigirIdentidadePacienteDto — CPF', () => {
  it('dígito verificador errado (555.444.333-12): recusado', async () => {
    expect(await erros({ cpf: '555.444.333-12' })).toContain('cpf');
  });
  it('sequência repetida (111.111.111-11): recusada', async () => {
    expect(await erros({ cpf: '11111111111' })).toContain('cpf');
  });
  it('CPF válido: aceito; sem CPF (corrigindo só o nome): aceito', async () => {
    expect(await erros({ cpf: '390.533.447-05' })).not.toContain('cpf');
    expect(await erros({ nome: 'Fulana' })).not.toContain('cpf');
  });
});
