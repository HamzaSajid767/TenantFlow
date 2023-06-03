import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission } from '@saasforge/shared';
import type { Request } from 'express';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator';
import { clientIp } from '../common/crypto/crypto.util';
import { OrgMemberGuard } from '../common/guards/org-member.guard';
import { OrgPermissionsGuard } from '../common/guards/org-permissions.guard';
import { CreateInvitationDto } from './dto/invitation.dto';
import { AcceptInvitationDto, InvitationsService } from './invitations.service';

@ApiTags('invitations')
@ApiBearerAuth()
@Controller()
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @UseGuards(OrgMemberGuard, OrgPermissionsGuard)
  @RequirePermissions(Permission.MEMBER_INVITE)
  @Post('organizations/:id/invitations')
  create(
    @Param('id') organizationId: string,
    @Body() dto: CreateInvitationDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.invitations.create(organizationId, dto, user, this.role(req), this.meta(req));
  }

  @UseGuards(OrgMemberGuard, OrgPermissionsGuard)
  @RequirePermissions(Permission.MEMBER_READ)
  @Get('organizations/:id/invitations')
  list(@Param('id') organizationId: string) {
    return this.invitations.list(organizationId);
  }

  @UseGuards(OrgMemberGuard, OrgPermissionsGuard)
  @RequirePermissions(Permission.MEMBER_INVITE)
  @Delete('organizations/:id/invitations/:invitationId')
  revoke(
    @Param('id') organizationId: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.invitations.revoke(organizationId, invitationId, user, this.meta(req));
  }

  @Post('invitations/accept')
  accept(@Body() dto: AcceptInvitationDto, @CurrentUser() user: RequestUser, @Req() req: Request) {
    return this.invitations.accept(dto.token, user, this.meta(req));
  }

  @Post('invitations/reject')
  reject(@Body() dto: AcceptInvitationDto, @CurrentUser() user: RequestUser) {
    return this.invitations.reject(dto.token, user);
  }

  private role(req: Request): string {
    return (req as Request & { org: { role: string } }).org.role;
  }

  private meta(req: Request) {
    return {
      ip: clientIp(req.headers as Record<string, unknown>, req.ip),
      ua: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    };
  }
}
