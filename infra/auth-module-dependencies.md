# Auth module integration

Install runtime dependencies in the API package:

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt speakeasy ioredis cookie-parser
npm install -D @types/bcrypt @types/passport-jwt @types/speakeasy @types/cookie-parser
```

Required environment variables:

```env
JWT_ACCESS_SECRET=change-me-access-secret
JWT_REFRESH_SECRET=change-me-refresh-secret
REDIS_URL=redis://localhost:6379
BCRYPT_ROUNDS=12
TOTP_ISSUER=Patient SaaS
```

Wire `AuthModule` into the API root module and enable cookies in `main.ts`:

```ts
import * as cookieParser from 'cookie-parser';

app.use(cookieParser());
```

Protect routes with:

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Papel.ADMIN, Papel.MEDICO)
```
