# Multi-tenancy integration

Register `ClinicasModule` early in the API root module.

To enforce tenant presence globally, register `JwtAuthGuard` before `TenantRequiredGuard` as `APP_GUARD`s:

```ts
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/presentation/guards/jwt-auth.guard';
import { TenantRequiredGuard } from './common/tenancy/tenant-required.guard';

providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: TenantRequiredGuard },
]
```

Use `@AllowWithoutTenant()` only for explicitly public routes:

- `POST /auth/register`
- `POST /auth/login`

Clinic bootstrap must run through the CLI seed command, protected by `BOOTSTRAP_SECRET`; it must not be exposed as an HTTP route in production.

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
