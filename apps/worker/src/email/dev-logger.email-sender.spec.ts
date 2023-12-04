import { DevLoggerEmailSender } from './dev-logger.email-sender';

describe('DevLoggerEmailSender', () => {
  it('sends without throwing', async () => {
    const sender = new DevLoggerEmailSender();
    await expect(
      sender.sendInvitation({
        to: 'dev@example.com',
        organizationName: 'Acme',
        role: 'DEVELOPER',
        inviteUrl: 'http://localhost/invitations/accept?token=abc',
        expiresAt: new Date().toISOString(),
      }),
    ).resolves.toBeUndefined();
  });
});
