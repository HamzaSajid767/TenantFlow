import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InvitationStatus, JobName, QueueName } from '@saasforge/shared';
import type { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';

@Processor(QueueName.MAINTENANCE)
export class MaintenanceProcessor extends WorkerHost {
  private readonly logger = new Logger(MaintenanceProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === JobName.EXPIRE_INVITATIONS) {
      const result = await this.prisma.client.invitation.updateMany({
        where: {
          status: InvitationStatus.PENDING,
          expiresAt: { lt: new Date() },
        },
        data: { status: InvitationStatus.EXPIRED },
      });
      this.logger.log(`Expired ${result.count} invitations`);
      return;
    }

    if (job.name === JobName.PURGE_REFRESH_TOKENS) {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const result = await this.prisma.client.refreshToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: cutoff } }],
        },
      });
      this.logger.log(`Purged ${result.count} refresh tokens`);
    }
  }
}
