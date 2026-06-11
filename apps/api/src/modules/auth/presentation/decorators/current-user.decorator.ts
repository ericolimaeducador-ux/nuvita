import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthTokenPayload } from '../../../../../../../packages/shared/src/auth';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthTokenPayload | undefined => {
    const request = context.switchToHttp().getRequest<{ user?: AuthTokenPayload }>();
    return request.user;
  },
);
