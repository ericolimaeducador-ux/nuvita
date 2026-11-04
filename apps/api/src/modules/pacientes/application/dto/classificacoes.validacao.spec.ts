import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreatePacienteDto } from './create-paciente.dto';
import { UpdatePacienteDto } from './update-paciente.dto';

// Classificação de área: ao menos uma no cadastro; valores só IU, FA, OT; sem repetição.
const base = { clinicaId: '6addf106f1ed2961f5111e68', nome: 'Paciente Fictício', dataNascimento: '1990-04-12' };
const opcoes = { whitelist: true, forbidNonWhitelisted: true };
const errosCriacao = async (over: Record<string, unknown>) =>
  (await validate(plainToInstance(CreatePacienteDto, { ...base, ...over }), opcoes)).map((e) => e.property);
const errosEdicao = async (over: Record<string, unknown>) =>
  (await validate(plainToInstance(UpdatePacienteDto, over), opcoes)).map((e) => e.property);

describe('CreatePacienteDto — classificacoes', () => {
  it.each([[['IU']], [['FA']], [['OT']], [['IU', 'FA']], [['IU', 'FA', 'OT']]])('%j: aceito', async (classificacoes) => {
    expect(await errosCriacao({ classificacoes })).not.toContain('classificacoes');
  });

  it('ausente: recusado (cadastro exige ao menos uma)', async () => {
    expect(await errosCriacao({})).toContain('classificacoes');
  });

  it.each([[[]], [['XX']], [['IU', 'IU']], ['IU']])('%j: recusado', async (classificacoes) => {
    expect(await errosCriacao({ classificacoes })).toContain('classificacoes');
  });
});

describe('UpdatePacienteDto — classificacoes (PATCH parcial)', () => {
  it('não enviar a classificação é aceito', async () => {
    expect(await errosEdicao({ telefone: '11999998888' })).not.toContain('classificacoes');
  });
  it('enviar vazia ou inválida é recusado', async () => {
    expect(await errosEdicao({ classificacoes: [] })).toContain('classificacoes');
    expect(await errosEdicao({ classificacoes: ['ZZ'] })).toContain('classificacoes');
  });
  it('enviar uma lista válida é aceito', async () => {
    expect(await errosEdicao({ classificacoes: ['IU', 'OT'] })).not.toContain('classificacoes');
  });
  it('o cliente NÃO consegue gravar etapaFluxo pelo PATCH (campo rejeitado pela whitelist)', async () => {
    expect(await errosEdicao({ etapaFluxo: 'concluido' })).toContain('etapaFluxo');
  });
});
