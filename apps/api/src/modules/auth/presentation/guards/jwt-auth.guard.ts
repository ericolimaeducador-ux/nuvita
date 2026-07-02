import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Autentica SEMPRE que aplicado. A isenção de tenant (@AllowWithoutTenant) é
// responsabilidade exclusiva do TenantRequiredGuard — pular a autenticação aqui
// deixava request.user vazio e o SuperAdminGuard respondia 403 para todo mundo.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
