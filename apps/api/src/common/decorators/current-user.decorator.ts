import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { OrganizationRole } from '@saasforge/shared';

export type RequestUser = {
  id: string;
  email: string;
};

export type RequestOrg = {
  organizationId: string;
  membershipId: string;
  role: OrganizationRole;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    return request.user;
  },
);

export const CurrentOrg = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestOrg => {
    const request = ctx.switchToHttp().getRequest<{ org: RequestOrg }>();
    return request.org;
  },
);
