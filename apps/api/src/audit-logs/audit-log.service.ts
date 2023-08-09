import { Injectable } from '@nestjs/common';
import type { AuditAction, ResourceType } from '@saasforge/shared';
import { PrismaService } from '../database/prisma.service';

export type AuditInput = {
  organizationId?: string | null;
  actorUserId: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: AuditInput): Promise<void> {
    await this.prisma.client.auditLog.create({
      data: {
        organizationId: input.organizationId ?? null,
        actorUserId: input.actorUserId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        metadata: (input.metadata as object | undefined) ?? undefined,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }
}
