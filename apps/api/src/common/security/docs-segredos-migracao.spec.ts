import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * R1.5 — trava de documentação: na migração do Nuvita Estomaterapia, PATIENT_DATA_ENCRYPTION_KEY, PATIENT_DATA_HASH_KEY
 * e PRONTUARIO_SIGNATURE_SECRET do serviço real são REAPROVEITADAS (nunca geradas de novo nem rotacionadas), senão os
 * dados reais ficam indecifráveis. Estes docs já mandaram o contrário; o teste impede que a instrução volte.
 */
const raiz = join(__dirname, '..', '..', '..', '..', '..');
const ler = (rel: string) => readFileSync(join(raiz, rel), 'utf8');

const DOCS_COM_AVISO = [
  'infra/PRODUCTION-CHECKLIST.md',
  'infra/GCP-SECRETS-KMS-SETUP.md',
  'infra/QUICK-START-SECRETS.md',
  'docs/seguranca/INVENTARIO-SEGREDOS.md',
];

describe('R1.5 — docs de segredos coerentes com a migração (chaves reaproveitadas)', () => {
  it.each(DOCS_COM_AVISO)('%s traz o aviso de reaproveitamento das três chaves', (doc) => {
    const texto = ler(doc);
    expect(texto).toMatch(/REAPROVEITADAS do serviço real do Nuvita/);
    for (const chave of ['PATIENT_DATA_ENCRYPTION_KEY', 'PATIENT_DATA_HASH_KEY', 'PRONTUARIO_SIGNATURE_SECRET']) expect(texto).toContain(chave);
    expect(texto).toMatch(/nunca geradas de novo e nunca\s*(>\s*)?rotacionadas/);
  });

  it('o checklist não manda mais gerar chaves de paciente novas sem marcar como específico do psi', () => {
    const texto = ler('infra/PRODUCTION-CHECKLIST.md');
    expect(texto).not.toMatch(/Mesmo no mesmo projeto GCP, gere segredos \*\*novos e distintos\*\* para/);
    expect(texto).not.toMatch(/nunca reaproveitar as chaves\/segredos do Nuvita original/);
  });

  it('a política de rotação não prevê rotacionar as chaves de paciente nem a de assinatura', () => {
    const texto = ler('infra/GCP-SECRETS-KMS-SETUP.md');
    expect(texto).not.toMatch(/\| `patient-data-\*` \| 365 days/);
    expect(texto).toMatch(/\| `prontuario-signature-secret` \| \*\*NUNCA\*\*/);
    expect(texto).not.toMatch(/versions add patient-data-encryption-key/);
  });
});
