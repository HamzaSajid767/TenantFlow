import { Module } from '@nestjs/common';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService, AuditLogService],
})
export class ProjectsModule {}
