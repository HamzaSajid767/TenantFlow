import { Injectable, Logger } from '@nestjs/common';
import type { EmailSender, InvitationEmail } from './email-sender';

@Injectable()
export class DevLoggerEmailSender implements EmailSender {
  private readonly logger = new Logger(DevLoggerEmailSender.name);

  async sendInvitation(email: InvitationEmail): Promise<void> {
    this.logger.log({
      driver: 'development',
      to: email.to,
      organizationName: email.organizationName,
      role: email.role,
      expiresAt: email.expiresAt,
      inviteUrl: email.inviteUrl,
    });
  }
}
