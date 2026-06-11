# Multi-tenancy integration

Register `ClinicasModule` early in the API root module.

To enforce tenant presence globally, register `TenantRequiredGuard` as an `APP_GUARD`:

```ts
import { APP_GUARD } from '@nestjs/core';
import { TenantRequiredGuard } from './common/tenancy/tenant-required.guard';

providers: [
  { provide: APP_GUARD, useClass: TenantRequiredGuard },
]
```

Use `@AllowWithoutTenant()` only for public bootstrap routes such as:

- `POST /clinicas/onboarding`
- `POST /auth/login`
- public webhooks that validate their own signatures

Indexes added directly to existing schemas:

- `users`: `{ clinicaId: 1, _id: 1 }`
- `pacientes`: `{ clinicaId: 1, _id: 1 }`
- `prontuarios`: `{ clinicaId: 1, _id: 1 }`
- `notificacoes`: `{ clinicaId: 1, _id: 1 }`
- `notificacao_preferencias`: `{ clinicaId: 1, _id: 1 }`
- `documentos`: `{ clinicaId: 1, _id: 1 }`

Subdomain routing belongs in the API Gateway/reverse proxy:

```text
*.seuapp.com.br -> api service
Host clinica-abc.seuapp.com.br preserved as Host header
APP_ROOT_DOMAIN=seuapp.com.br
```

Plan limits are defined in `LIMITES_POR_PLANO` and should be checked by modules before creating users, patients, or enabling paid features.
