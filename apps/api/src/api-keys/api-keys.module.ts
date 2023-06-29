import { Module } from '@nestjs/common';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';

@Module({
  controllers: [ApiKeysController],
  providers: [ApiKeysService, AuditLogService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
