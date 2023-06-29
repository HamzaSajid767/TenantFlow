import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuditAction, ErrorCode, ResourceType } from '@saasforge/shared';
import { AuditLogService } from '../audit-logs/audit-log.service';
import type { RequestUser } from '../common/decorators/current-user.decorator';
import { AppError } from '../common/errors/app.error';
import type { EnvironmentVariables } from '../config/env';
import { PrismaService } from '../database/prisma.service';
import { CreateApiKeyDto, generateApiKey, hashApiKey } from './api-key.crypto';

const publicSelect = {
  id: true,
  name: true,
  keyPrefix: true,
  projectId: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true,
  createdByUserId: true,
} as const;

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async create(
    organizationId: string,
    dto: CreateApiKeyDto,
    actor: RequestUser,
    meta: { ip?: string; ua?: string },
  ) {
    const project = await this.prisma.client.project.findFirst({
      where: { id: dto.projectId, organizationId },
    });
    if (!project) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Project not found');
    }

    const generated = generateApiKey();
    const pepper = this.config.get('API_KEY_PEPPER', { infer: true });
    const record = await this.prisma.client.apiKey.create({
      data: {
        organizationId,
        projectId: dto.projectId,
        name: dto.name.trim(),
        keyPrefix: generated.prefix,
        keyHash: hashApiKey(pepper, generated.secret),
        createdByUserId: actor.id,
      },
      select: publicSelect,
    });

    await this.audit.record({
      organizationId,
      actorUserId: actor.id,
      action: AuditAction.API_KEY_CREATE,
      resourceType: ResourceType.API_KEY,
      resourceId: record.id,
      metadata: { name: record.name, prefix: record.keyPrefix, projectId: dto.projectId },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });

    return { ...record, secret: generated.secret };
  }

  list(organizationId: string) {
    return this.prisma.client.apiKey.findMany({
      where: { organizationId },
      select: publicSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(
    organizationId: string,
    keyId: string,
    actor: RequestUser,
    meta: { ip?: string; ua?: string },
  ) {
    const key = await this.prisma.client.apiKey.findFirst({
      where: { id: keyId, organizationId },
    });
    if (!key) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'API key not found');
    }
    if (key.revokedAt) {
      throw new AppError(409, ErrorCode.CONFLICT, 'API key is already revoked');
    }
    await this.prisma.client.apiKey.update({
      where: { id: key.id },
      data: { revokedAt: new Date() },
    });
    await this.audit.record({
      organizationId,
      actorUserId: actor.id,
      action: AuditAction.API_KEY_REVOKE,
      resourceType: ResourceType.API_KEY,
      resourceId: key.id,
      metadata: { prefix: key.keyPrefix },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return { success: true };
  }
}
