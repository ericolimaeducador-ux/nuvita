// R1 (Nuvita Estomaterapia) — chaves REAPROVEITADAS do serviço real do Nuvita na virada: copiadas do Secret Manager,
// NUNCA geradas de novo nem rotacionadas. Gerar ou rotacionar qualquer uma deixa os dados reais indecifráveis (CPF e
// responsável legal), quebra a busca/unicidade por CPF e invalida a verificação de prontuários e consultas assinados.
// Ver infra/PRODUCTION-CHECKLIST.md e docs/seguranca/INVENTARIO-SEGREDOS.md.

/** Nome em variável de ambiente -> nome no Secret Manager. */
export const CHAVES_REAPROVEITADAS = {
  PATIENT_DATA_ENCRYPTION_KEY: 'patient-data-encryption-key',
  PATIENT_DATA_HASH_KEY: 'patient-data-hash-key',
  PRONTUARIO_SIGNATURE_SECRET: 'prontuario-signature-secret',
};

const PROIBIDAS = new Set(
  Object.entries(CHAVES_REAPROVEITADAS).flatMap(([env, sm]) => [env.toLowerCase(), sm.toLowerCase()]),
);

export const MENSAGEM_CHAVE_REAPROVEITADA =
  'PATIENT_DATA_ENCRYPTION_KEY, PATIENT_DATA_HASH_KEY e PRONTUARIO_SIGNATURE_SECRET são REAPROVEITADAS do serviço real ' +
  'do Nuvita (copiadas do Secret Manager) e NUNCA geradas nem rotacionadas — senão os dados reais ficam indecifráveis.';

/** Nomes (de uma lista, de flags ou de argumentos) que são chaves reaproveitadas. */
export function chavesReaproveitadasEm(nomes) {
  const encontradas = [];
  for (const bruto of nomes) {
    for (const parte of String(bruto).split(/[=,\s]+/)) {
      const nome = parte.replace(/^-+/, '').trim().toLowerCase();
      if (nome && PROIBIDAS.has(nome)) encontradas.push(parte.replace(/^-+/, '').trim());
    }
  }
  return encontradas;
}

/** Aborta (lança) se a lista/argumentos tentarem incluir alguma chave reaproveitada. */
export function abortarSeChaveReaproveitada(nomes, origem) {
  const encontradas = chavesReaproveitadasEm(nomes);
  if (encontradas.length > 0) {
    throw new Error(`${origem}: recusado incluir ${encontradas.join(', ')}. ${MENSAGEM_CHAVE_REAPROVEITADA}`);
  }
}
