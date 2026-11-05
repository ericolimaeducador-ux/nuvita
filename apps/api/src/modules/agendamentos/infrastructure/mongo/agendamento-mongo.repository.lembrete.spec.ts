import { AgendamentoMongoRepository } from './agendamento-mongo.repository';
import { calcularJanelaLembrete } from '../../domain/lembrete-window';

/**
 * feature-consultation-reminder-scheduler: listarParaLembrete precisa
 * construir o filtro do Mongo com a janela exata calculada em
 * domain/lembrete-window.ts e aplicar a idempotência DENTRO da query
 * ($exists: false no campo do lembrete), não como checagem posterior.
 *
 * O fixture `janela` usado abaixo vem de calcularJanelaLembrete() (a mesma
 * função pura testada exaustivamente em lembrete-window.spec.ts), não de
 * datas literais — isso prova que o repositório repassa inicio/fim tal
 * como a função os produz, sem reimplementar a aritmética de datas por
 * conta própria. Se algum dia o repositório passar a calcular a janela
 * sozinho em vez de recebê-la pronta, esse teste some do jeito que está
 * escrito hoje (ele não testaria mais nada), o que é o sinal de alerta
 * certo para pegar essa divergência em review.
 *
 * Sem mongodb-memory-server no projeto (mesma limitação já documentada em
 * user-mongo.repository.spec.ts): Model é mockado, sem round-trip real de
 * Mongo — este teste prova a FORMA do filtro passado a model.find(), não o
 * comportamento real das bordas do Mongo. A prova de borda (a parte
 * sensível a erro de sinal invertido) está em domain/lembrete-window.spec.ts.
 *
 * Escopo global proposital: sem clinicaId no filtro — este é um job de
 * sistema que varre todas as clínicas, diferente de list()/listBloqueios()
 * que são sempre escopados por tenant.
 */
function makeRepository() {
  const execFind = jest.fn().mockResolvedValue([]);
  const sort = jest.fn().mockReturnValue({ exec: execFind });
  const find = jest.fn().mockReturnValue({ sort });
  const execFindOneAndUpdate = jest.fn().mockResolvedValue(null);
  const findOneAndUpdate = jest.fn().mockReturnValue({ exec: execFindOneAndUpdate });
  const agendamentoModel = { find, findOneAndUpdate };
  const bloqueioModel = {};

  const repository = new AgendamentoMongoRepository(agendamentoModel as never, bloqueioModel as never);
  return { repository, find, sort, execFind, findOneAndUpdate, execFindOneAndUpdate };
}

describe('AgendamentoMongoRepository.listarParaLembrete — filtro da janela-devida', () => {
  const REFERENCIA = new Date('2026-09-16T12:00:00.000Z');

  it('filtra por $gte/$lt na janela (produzida por calcularJanelaLembrete) e $exists:false no campo do lembrete, sem clinicaId', async () => {
    const { repository, find } = makeRepository();
    const janela = calcularJanelaLembrete(REFERENCIA, 24);

    await repository.listarParaLembrete('lembrete24hEnviadoEm', janela);

    expect(find).toHaveBeenCalledWith({
      dataHoraInicio: { $gte: janela.inicio, $lt: janela.fim },
      lembrete24hEnviadoEm: { $exists: false },
    });
  });

  it('usa o nome do campo recebido (lembrete1hEnviadoEm) para a idempotência, com a janela do horizonte de 1h', async () => {
    const { repository, find } = makeRepository();
    const janela = calcularJanelaLembrete(REFERENCIA, 1);

    await repository.listarParaLembrete('lembrete1hEnviadoEm', janela);

    expect(find).toHaveBeenCalledWith({
      dataHoraInicio: { $gte: janela.inicio, $lt: janela.fim },
      lembrete1hEnviadoEm: { $exists: false },
    });
  });
});

/**
 * marcarLembreteEnviado: update ATÔMICO condicional — o próprio filtro do
 * findOneAndUpdate exige `[campo]: {$exists:false}`, não um find() separado
 * seguido de um set(). É essa condição no filtro (não uma leitura prévia)
 * que detecta corretamente uma colisão de idempotência entre duas
 * execuções concorrentes: se a outra já marcou, este findOneAndUpdate não
 * acha o documento e retorna null.
 */
describe('AgendamentoMongoRepository.marcarLembreteEnviado', () => {
  it('update condicional: filtro exige o campo ausente, $set com a data recebida; encontrou → true', async () => {
    const { repository, findOneAndUpdate, execFindOneAndUpdate } = makeRepository();
    const quando = new Date('2026-09-18T12:00:00.000Z');
    execFindOneAndUpdate.mockResolvedValue({ _id: '507f1f77bcf86cd799439011' });

    const resultado = await repository.marcarLembreteEnviado('cli-1', '507f1f77bcf86cd799439011', 'lembrete24hEnviadoEm', quando);

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ clinicaId: 'cli-1', lembrete24hEnviadoEm: { $exists: false } }),
      { $set: { lembrete24hEnviadoEm: quando } },
    );
    expect(resultado).toBe(true);
  });

  it('não encontrou (campo já setado por outra execução) → false, colisão de idempotência', async () => {
    const { repository, execFindOneAndUpdate } = makeRepository();
    execFindOneAndUpdate.mockResolvedValue(null);

    const resultado = await repository.marcarLembreteEnviado('cli-1', '507f1f77bcf86cd799439011', 'lembrete1hEnviadoEm', new Date());

    expect(resultado).toBe(false);
  });
});
