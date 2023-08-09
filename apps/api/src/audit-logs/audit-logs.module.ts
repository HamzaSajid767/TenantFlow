import { Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLogsController } from './audit-logs.controller';
import { AuditLogsQueryService } from './audit-logs-query.service';

@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogService, AuditLogsQueryService],
  exports: [AuditLogService],
})
export class AuditLogsModule {}
