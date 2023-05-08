import { Module } from '@nestjs/common';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService, AuditLogService],
})
export class OrganizationsModule {}
