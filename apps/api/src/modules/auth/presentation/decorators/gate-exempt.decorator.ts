import { SetMetadata } from '@nestjs/common';

export const GATE_EXEMPT_KEY = 'gateExempt';

/**
 * Marca um handler (ou controller) como acessível mesmo com um gate pós-login
 * pendente. Reservado aos endpoints que resolvem os próprios gates
 * (`aceitar-termos`, `trocar-senha-obrigatoria`) e ao `logout`.
 *
 * Mesmo padrão do `@AllowWithoutTenant()` para o `TenantRequiredGuard`.
 */
export const GateExempt = () => SetMetadata(GATE_EXEMPT_KEY, true);
