import 'reflect-metadata';
import { AppModule } from '../../app.module';

// O CI nunca sobe a aplicação, então um parâmetro de construtor que o Nest não consegue injetar (interface,
// objeto de opções, tipo primitivo) passa em todos os testes e derruba o container no boot em produção.
// Este teste varre TODOS os módulos e provedores/controllers e reprova qualquer parâmetro sem injeção possível.
const PARAMTYPES = 'design:paramtypes';
const SELF_DEPS = 'self:paramtypes';
const OPTIONAL_DEPS = 'optional:paramtypes';
const NAO_INJETAVEIS = new Set<unknown>([Object, String, Number, Boolean, Array, Function, undefined]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Classe = abstract new (...args: any[]) => unknown;

type ModuloLike = { module?: unknown; providers?: unknown[]; controllers?: unknown[]; imports?: unknown[] };

function classesDoModulo(modulo: unknown, vistos: Set<unknown>, saida: Set<Classe>) {
  const dinamico = modulo as ModuloLike;
  const classe = (dinamico?.module ?? modulo) as Classe;
  if (!classe || vistos.has(classe)) return;
  vistos.add(classe);

  const providers = [...(Reflect.getMetadata('providers', classe) ?? []), ...(dinamico?.providers ?? [])];
  const controllers = [...(Reflect.getMetadata('controllers', classe) ?? []), ...(dinamico?.controllers ?? [])];
  for (const p of providers) {
    if (typeof p === 'function') saida.add(p as Classe);
    else if (p && typeof (p as { useClass?: unknown }).useClass === 'function') saida.add((p as { useClass: Classe }).useClass);
  }
  for (const c of controllers) if (typeof c === 'function') saida.add(c as Classe);

  const imports = [...(Reflect.getMetadata('imports', classe) ?? []), ...(dinamico?.imports ?? [])];
  for (const i of imports) classesDoModulo(i, vistos, saida);
}

describe('DI: todo parâmetro de construtor precisa ser injetável', () => {
  it('nenhum provedor/controller declara parâmetro de tipo Object/primitivo sem @Inject nem @Optional', () => {
    const classes = new Set<Classe>();
    classesDoModulo(AppModule, new Set(), classes);
    expect(classes.size).toBeGreaterThan(50);

    const violacoes: string[] = [];
    for (const classe of classes) {
      const tipos: unknown[] = Reflect.getMetadata(PARAMTYPES, classe) ?? [];
      const proprios: Array<{ index: number }> = Reflect.getMetadata(SELF_DEPS, classe) ?? [];
      const opcionais: number[] = Reflect.getMetadata(OPTIONAL_DEPS, classe) ?? [];
      tipos.forEach((tipo, index) => {
        const comToken = proprios.some((p) => p.index === index);
        if (NAO_INJETAVEIS.has(tipo) && !comToken && !opcionais.includes(index)) {
          violacoes.push(`${classe.name}[parâmetro ${index}]`);
        }
      });
    }
    expect(violacoes).toEqual([]);
  });
});
