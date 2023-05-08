import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission } from '@saasforge/shared';
import type { Request } from 'express';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentOrg, CurrentUser, type RequestOrg, type RequestUser } from '../common/decorators/current-user.decorator';
import { OrgMemberGuard } from '../common/guards/org-member.guard';
import { OrgPermissionsGuard } from '../common/guards/org-permissions.guard';
import { clientIp } from '../common/crypto/crypto.util';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post()
  create(@Body() dto: CreateOrganizationDto, @CurrentUser() user: RequestUser, @Req() req: Request) {
    return this.organizations.create(user, dto, this.meta(req));
  }

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.organizations.listForUser(user.id);
  }

  @UseGuards(OrgMemberGuard, OrgPermissionsGuard)
  @Get(':id')
  get(@Param('id') id: string, @CurrentOrg() org: RequestOrg) {
    return this.organizations.get(id, org.role);
  }

  @UseGuards(OrgMemberGuard, OrgPermissionsGuard)
  @RequirePermissions(Permission.ORG_UPDATE)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.organizations.update(id, user, dto, this.meta(req));
  }

  @UseGuards(OrgMemberGuard, OrgPermissionsGuard)
  @RequirePermissions(Permission.ORG_DELETE)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser, @Req() req: Request) {
    return this.organizations.remove(id, user, this.meta(req));
  }

  private meta(req: Request) {
    return {
      ip: clientIp(req.headers as Record<string, unknown>, req.ip),
      ua: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    };
  }
}
