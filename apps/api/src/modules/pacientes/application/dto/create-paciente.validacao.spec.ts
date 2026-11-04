import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePacienteDto } from './create-paciente.dto';

// Cadastro: CPF com dígito verificador válido (quando informado) e nascimento que não seja futuro.
const base = { clinicaId: '6addf106f1ed2961f5111e68', nome: 'Paciente Fictício', dataNascimento: '1990-04-12' };
const opcoes = { whitelist: true, forbidNonWhitelisted: true };
const dto = (over: Record<string, unknown>) => plainToInstance(CreatePacienteDto, { ...base, ...over });
const erros = async (over: Record<string, unknown>) => (await validate(dto(over), opcoes)).map((e) => e.property);

describe('CreatePacienteDto — CPF', () => {
  it.each(['39053344705', '390.533.447-05'])('CPF válido (%s): aceito', async (cpf) => {
    expect(await erros({ cpf })).not.toContain('cpf');
  });
  it('CPF com formato certo e dígito verificador errado (555.444.333-12): recusado', async () => {
    expect(await erros({ cpf: '555.444.333-12' })).toContain('cpf');
  });
  it('sequência repetida (111.111.111-11): recusada', async () => {
    expect(await erros({ cpf: '11111111111' })).toContain('cpf');
  });
  it('sem CPF: continua aceito (o campo é opcional)', async () => {
    expect(await erros({})).not.toContain('cpf');
  });
});

describe('CreatePacienteDto — data de nascimento', () => {
  const diaDe = (deslocamentoDias: number) => {
    const d = new Date();
    d.setDate(d.getDate() + deslocamentoDias);
    return d.toISOString().slice(0, 10);
  };
  it('data futura (amanhã): recusada', async () => {
    expect(await erros({ dataNascimento: diaDe(2) })).toContain('dataNascimento');
  });
  it('13/10/2026 não é mais aceito se estiver no futuro; data passada e hoje: aceitas', async () => {
    expect(await erros({ dataNascimento: '2000-01-01' })).not.toContain('dataNascimento');
    expect(await erros({ dataNascimento: diaDe(-1) })).not.toContain('dataNascimento');
  });
});
