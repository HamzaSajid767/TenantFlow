import { Body, Controller, Delete, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission } from '@saasforge/shared';
import type { Request } from 'express';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentOrg, CurrentUser, type RequestOrg, type RequestUser } from '../common/decorators/current-user.decorator';
import { clientIp } from '../common/crypto/crypto.util';
import { OrgMemberGuard } from '../common/guards/org-member.guard';
import { OrgPermissionsGuard } from '../common/guards/org-permissions.guard';
import { UpdateMemberRoleDto } from './dto/membership.dto';
import { MembershipsService } from './memberships.service';

@ApiTags('members')
@ApiBearerAuth()
@UseGuards(OrgMemberGuard, OrgPermissionsGuard)
@Controller('organizations/:id/members')
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @RequirePermissions(Permission.MEMBER_READ)
  @Get()
  list(@Param('id') organizationId: string) {
    return this.memberships.list(organizationId);
  }

  @RequirePermissions(Permission.MEMBER_READ)
  @Get(':memberId')
  get(@Param('id') organizationId: string, @Param('memberId') memberId: string) {
    return this.memberships.get(organizationId, memberId);
  }

  @RequirePermissions(Permission.MEMBER_UPDATE_ROLE)
  @Patch(':memberId')
  updateRole(
    @Param('id') organizationId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: RequestUser,
    @CurrentOrg() org: RequestOrg,
    @Req() req: Request,
  ) {
    return this.memberships.updateRole(organizationId, memberId, dto, user, org.role, this.meta(req));
  }

  @RequirePermissions(Permission.MEMBER_REMOVE)
  @Delete(':memberId')
  remove(
    @Param('id') organizationId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: RequestUser,
    @CurrentOrg() org: RequestOrg,
    @Req() req: Request,
  ) {
    return this.memberships.remove(organizationId, memberId, user, org.role, this.meta(req));
  }

  private meta(req: Request) {
    return {
      ip: clientIp(req.headers as Record<string, unknown>, req.ip),
      ua: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    };
  }
}
