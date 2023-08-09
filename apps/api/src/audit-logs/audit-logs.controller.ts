import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission } from '@saasforge/shared';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { OrgMemberGuard } from '../common/guards/org-member.guard';
import { OrgPermissionsGuard } from '../common/guards/org-permissions.guard';
import { AuditLogsQueryService } from './audit-logs-query.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@ApiTags('audit-logs')
@ApiBearerAuth()
@UseGuards(OrgMemberGuard, OrgPermissionsGuard)
@Controller('organizations/:id/audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogs: AuditLogsQueryService) {}

  @RequirePermissions(Permission.AUDIT_READ)
  @Get()
  list(@Param('id') organizationId: string, @Query() query: AuditLogQueryDto) {
    return this.auditLogs.list(organizationId, query);
  }
}
