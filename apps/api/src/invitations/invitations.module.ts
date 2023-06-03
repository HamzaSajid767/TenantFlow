import { Module } from '@nestjs/common';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  controllers: [InvitationsController],
  providers: [InvitationsService, AuditLogService],
})
export class InvitationsModule {}
