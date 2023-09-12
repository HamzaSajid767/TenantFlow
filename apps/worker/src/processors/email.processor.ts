import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { JobName, QueueName, type SendInvitationJobData } from '@saasforge/shared';
import type { Job } from 'bullmq';
import { EMAIL_SENDER, type EmailSender } from '../email/email-sender';

@Processor(QueueName.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(@Inject(EMAIL_SENDER) private readonly email: EmailSender) {
    super();
  }

  async process(job: Job<SendInvitationJobData>): Promise<void> {
    if (job.name !== JobName.SEND_INVITATION) {
      return;
    }
    const publicUrl = process.env.APP_PUBLIC_URL ?? 'http://localhost:5173';
    await this.email.sendInvitation({
      to: job.data.email,
      organizationName: job.data.organizationName,
      role: job.data.role,
      expiresAt: job.data.expiresAt,
      inviteUrl: `${publicUrl}/invitations/accept?token=${job.data.token}`,
    });
    this.logger.log(`Invitation email processed invitationId=${job.data.invitationId}`);
  }
}
