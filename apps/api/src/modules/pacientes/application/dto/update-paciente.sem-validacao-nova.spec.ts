import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdatePacienteDto } from './update-paciente.dto';

// As regras novas (dígito verificador do CPF, nascimento não futuro) valem só na CRIAÇÃO:
// um paciente já cadastrado com CPF antigo inválido não pode quebrar o PATCH que reenvia o mesmo valor.
const opcoes = { whitelist: true, forbidNonWhitelisted: true };
const erros = async (corpo: Record<string, unknown>) => (await validate(plainToInstance(UpdatePacienteDto, corpo), opcoes)).map((e) => e.property);

describe('UpdatePacienteDto — não herda as validações novas da criação', () => {
  it('CPF com dígito verificador errado (já cadastrado): o DTO de edição não recusa', async () => {
    expect(await erros({ cpf: '555.444.333-12' })).not.toContain('cpf');
  });
  it('nascimento futuro já gravado: o DTO de edição não recusa', async () => {
    expect(await erros({ dataNascimento: '2999-01-01' })).not.toContain('dataNascimento');
  });
  it('o formato continua conferido (CPF mal formado ainda é recusado)', async () => {
    expect(await erros({ cpf: 'abc' })).toContain('cpf');
  });
});
