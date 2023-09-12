export const EMAIL_SENDER = Symbol('EMAIL_SENDER');

export type InvitationEmail = {
  to: string;
  organizationName: string;
  role: string;
  inviteUrl: string;
  expiresAt: string;
};

export interface EmailSender {
  sendInvitation(email: InvitationEmail): Promise<void>;
}
