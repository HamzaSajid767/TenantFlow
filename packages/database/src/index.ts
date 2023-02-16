import { PrismaClient } from './generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

export type { PrismaClient } from './generated/client';
export { Prisma } from './generated/client';
export type {
  User,
  Organization,
  Membership,
  Invitation,
  RefreshToken,
  Project,
  ApiKey,
  Event,
  UsageEvent,
  UsageDailyRollup,
  UsageEndpointRollup,
  AuditLog,
} from './generated/client';

export function createPrismaClient(connectionString: string): PrismaClient {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}
