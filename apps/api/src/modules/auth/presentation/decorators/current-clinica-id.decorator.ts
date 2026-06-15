import { createParamDecorator, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../../packages/shared/src/auth';

export const CurrentClinicaId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<{ user?: AuthTokenPayload }>();
    const clinicaId = request.user?.clinicaId;

    if (!clinicaId) {
      throw new ForbiddenException('Usuario sem clinicaId no token.');
    }

    return clinicaId;
  },
);
