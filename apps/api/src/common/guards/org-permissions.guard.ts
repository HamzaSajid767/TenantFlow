import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCode, type Permission, roleHasPermission } from '@saasforge/shared';
import { PERMISSIONS_KEY } from '../decorators/auth.decorators';
import type { RequestOrg } from '../decorators/current-user.decorator';
import { AppError } from '../errors/app.error';

@Injectable()
export class OrgPermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const org = context.switchToHttp().getRequest<{ org?: RequestOrg }>().org;
    if (!org) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Organization access required');
    }

    const allowed = required.every((permission) => roleHasPermission(org.role, permission));
    if (!allowed) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Insufficient permissions');
    }
    return true;
  }
}
