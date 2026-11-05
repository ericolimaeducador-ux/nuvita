import { NotFoundException } from '@nestjs/common';
import { ClinicasService } from './clinicas.service';

describe('ClinicasService.contextoDeEmissao', () => {
  function criar(clinica: unknown) {
    const clinicas = { findById: jest.fn().mockResolvedValue(clinica) };
    return new ClinicasService(clinicas as never, {} as never, {} as never, {} as never, {} as never);
  }

  it('devolve nome e fuso da clínica (para o servidor formatar data/hora do documento)', async () => {
    const service = criar({ id: 'c1', nome: 'Clínica Mente Sã', configuracoes: { fusoHorario: 'America/Sao_Paulo' } });
    await expect(service.contextoDeEmissao('c1')).resolves.toEqual({ nome: 'Clínica Mente Sã', fusoHorario: 'America/Sao_Paulo' });
  });

  it('clínica inexistente → 404', async () => {
    await expect(criar(null).contextoDeEmissao('c1')).rejects.toThrow(NotFoundException);
  });
});
