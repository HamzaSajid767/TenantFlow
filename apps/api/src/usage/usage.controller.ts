import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission } from '@saasforge/shared';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { OrgMemberGuard } from '../common/guards/org-member.guard';
import { OrgPermissionsGuard } from '../common/guards/org-permissions.guard';
import { UsageService } from './usage.service';

@ApiTags('usage')
@ApiBearerAuth()
@UseGuards(OrgMemberGuard, OrgPermissionsGuard)
@Controller('organizations/:id/usage')
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  @RequirePermissions(Permission.USAGE_READ)
  @Get()
  stats(@Param('id') organizationId: string) {
    return this.usage.stats(organizationId);
  }
}
