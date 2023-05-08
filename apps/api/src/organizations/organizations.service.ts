import { Injectable } from '@nestjs/common';
import { AuditAction, ErrorCode, ResourceType } from '@saasforge/shared';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { slugify } from '../common/crypto/crypto.util';
import type { RequestUser } from '../common/decorators/current-user.decorator';
import { AppError } from '../common/errors/app.error';
import { PrismaService } from '../database/prisma.service';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async create(user: RequestUser, dto: CreateOrganizationDto, meta: { ip?: string; ua?: string }) {
    const organization = await this.prisma.client.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: {
          name: dto.name.trim(),
          slug: slugify(dto.name),
        },
      });
      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: created.id,
          role: 'OWNER',
        },
      });
      return created;
    });

    await this.audit.record({
      organizationId: organization.id,
      actorUserId: user.id,
      action: AuditAction.ORG_CREATE,
      resourceType: ResourceType.ORGANIZATION,
      resourceId: organization.id,
      metadata: { name: organization.name },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });

    return { ...organization, role: 'OWNER' as const };
  }

  async listForUser(userId: string) {
    const memberships = await this.prisma.client.membership.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: 'desc' },
    });
    return memberships.map((membership) => ({
      ...membership.organization,
      role: membership.role,
    }));
  }

  async get(organizationId: string, role: string) {
    const organization = await this.prisma.client.organization.findFirst({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Organization not found');
    }
    return { ...organization, role };
  }

  async update(
    organizationId: string,
    user: RequestUser,
    dto: UpdateOrganizationDto,
    meta: { ip?: string; ua?: string },
  ) {
    const organization = await this.prisma.client.organization.update({
      where: { id: organizationId },
      data: { name: dto.name.trim() },
    });
    await this.audit.record({
      organizationId,
      actorUserId: user.id,
      action: AuditAction.ORG_UPDATE,
      resourceType: ResourceType.ORGANIZATION,
      resourceId: organizationId,
      metadata: { name: organization.name },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return organization;
  }

  async remove(organizationId: string, user: RequestUser, meta: { ip?: string; ua?: string }) {
    await this.audit.record({
      organizationId,
      actorUserId: user.id,
      action: AuditAction.ORG_DELETE,
      resourceType: ResourceType.ORGANIZATION,
      resourceId: organizationId,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    await this.prisma.client.organization.delete({ where: { id: organizationId } });
    return { success: true };
  }
}
