export const QueueName = {
  EMAIL: 'email',
  USAGE: 'usage',
  MAINTENANCE: 'maintenance',
} as const;

export type QueueName = (typeof QueueName)[keyof typeof QueueName];

export const JobName = {
  SEND_INVITATION: 'send-invitation',
  RECORD_USAGE: 'record-usage',
  AGGREGATE_DAILY: 'aggregate-daily',
  EXPIRE_INVITATIONS: 'expire-invitations',
  PURGE_REFRESH_TOKENS: 'purge-refresh-tokens',
} as const;

export type JobName = (typeof JobName)[keyof typeof JobName];

export type SendInvitationJobData = {
  invitationId: string;
  organizationName: string;
  email: string;
  role: string;
  token: string;
  expiresAt: string;
};

export type RecordUsageJobData = {
  requestId: string;
  organizationId: string;
  projectId: string;
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  occurredAt: string;
};
