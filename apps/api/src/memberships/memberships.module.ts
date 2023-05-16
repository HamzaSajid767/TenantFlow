import { Module } from '@nestjs/common';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';

@Module({
  controllers: [MembershipsController],
  providers: [MembershipsService, AuditLogService],
})
export class MembershipsModule {}
