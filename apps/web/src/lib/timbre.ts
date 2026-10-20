import type { MinhaClinica } from '@/api/resources';
import type { Endereco } from '@/types';

/** Texto não vazio (depois de aparar) ou undefined — campo vazio some do timbre. */
export function preenchido(valor?: string | null): string | undefined {
  const t = valor?.trim();
  return t ? t : undefined;
}

/** "CNPJ: 00.000.000/0000-00" ou "CPF: 000.000.000-00", conforme o tipo cadastrado. */
export function documentoRotulado(c: Pick<MinhaClinica, 'documento' | 'tipoDocumento'>): string | undefined {
  const doc = preenchido(c.documento);
  return doc ? `${c.tipoDocumento}: ${doc}` : undefined;
}

/** Endereço em uma linha; sem nenhuma parte preenchida devolve undefined (nunca "—"). */
export function enderecoEmLinha(e?: Endereco): string | undefined {
  if (!e) return undefined;
  const rua = [preenchido(e.logradouro), preenchido(e.numero)].filter(Boolean).join(', ');
  const complemento = preenchido(e.complemento);
  const cidadeUf = [preenchido(e.cidade), preenchido(e.estado)].filter(Boolean).join(' - ');
  const partes = [rua, complemento, preenchido(e.bairro), cidadeUf, preenchido(e.cep)].filter(Boolean);
  return partes.length ? partes.join(' · ') : undefined;
}

/** CRP presente = não vazio. Sem validar formato (sem fonte oficial do CFP). */
export function temCrp(crp?: string | null): boolean {
  return !!preenchido(crp);
}
