import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SafeUser } from '../types/authenticated-user.interface';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = SafeUser>(err: unknown, user: TUser | false, info: unknown): TUser {
    if (err) {
      throw err;
    }

    if (!user) {
      const expired = info instanceof Error && info.name === 'TokenExpiredError';
      throw new UnauthorizedException(expired ? '登录已过期，请重新登录' : '请先登录');
    }

    return user;
  }
}
