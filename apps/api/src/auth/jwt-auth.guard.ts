import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ErrorCode } from '@saasforge/shared';
import { IS_PUBLIC_KEY } from '../common/decorators/auth.decorators';
import { AppError } from '../common/errors/app.error';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  override handleRequest<TUser>(err: Error | undefined, user: TUser): TUser {
    if (err || !user) {
      throw new AppError(401, ErrorCode.UNAUTHENTICATED, 'Authentication required');
    }
    return user;
  }
}
