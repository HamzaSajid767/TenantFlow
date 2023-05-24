import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ErrorCode } from '@saasforge/shared';
import type { Request } from 'express';
import { AppError } from '../errors/app.error';
import type { RequestOrg, RequestUser } from '../decorators/current-user.decorator';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OrgMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<
      Request & { user?: RequestUser; org?: RequestOrg; params: { id?: string } }
    >();
    const user = request.user;
    const organizationId = request.params.id;
    if (!user || !organizationId) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Organization access required');
    }

    const membership = await this.prisma.client.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId,
        },
      },
    });

    if (!membership) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'You do not have access to this organization');
    }

    request.org = {
      organizationId,
      membershipId: membership.id,
      role: membership.role,
    };
    return true;
  }
}
