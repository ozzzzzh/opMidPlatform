import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedRequest, SafeUser } from '../types/authenticated-user.interface';

/** 注入由 JwtStrategy 校验后挂载的当前用户。 */
export const CurrentUser = createParamDecorator(
  (
    field: keyof SafeUser | undefined,
    context: ExecutionContext,
  ): SafeUser | SafeUser[keyof SafeUser] => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user as SafeUser;
    return field ? user[field] : user;
  },
);
