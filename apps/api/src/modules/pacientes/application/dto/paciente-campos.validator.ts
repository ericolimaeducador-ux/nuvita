import { registerDecorator, ValidationOptions } from 'class-validator';
import { cpfValido } from '../../../../../../../packages/shared/src/documentos';

/** CPF com dígitos verificadores válidos (o formato já é conferido por @Matches). Só roda quando o campo vem. */
export function IsCpfValido(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isCpfValido',
      target: object.constructor,
      propertyName,
      options: { message: 'CPF inválido.', ...options },
      validator: { validate: (valor: unknown) => typeof valor === 'string' && cpfValido(valor) },
    });
}

/** Data (ISO) que não seja posterior a hoje. Compara por dia de calendário, em UTC (a data vem como AAAA-MM-DD). */
export function IsDataNaoFutura(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'isDataNaoFutura',
      target: object.constructor,
      propertyName,
      options: { message: 'A data de nascimento não pode ser futura.', ...options },
      validator: {
        validate: (valor: unknown) => {
          if (typeof valor !== 'string') return false;
          const data = new Date(valor);
          if (Number.isNaN(data.getTime())) return false;
          const agora = new Date();
          const hoje = Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate());
          const nascimento = Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());
          return nascimento <= hoje;
        },
      },
    });
}
