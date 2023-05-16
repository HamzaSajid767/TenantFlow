import { Injectable } from '@nestjs/common';
import { AuditAction, ErrorCode, OrganizationRole, ResourceType } from '@saasforge/shared';
import { AuditLogService } from '../audit-logs/audit-log.service';
import type { RequestUser } from '../common/decorators/current-user.decorator';
import { AppError } from '../common/errors/app.error';
import { PrismaService } from '../database/prisma.service';
import { UpdateMemberRoleDto } from './dto/membership.dto';

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async list(organizationId: string) {
    const members = await this.prisma.client.membership.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return members.map((member) => this.toMember(member));
  }

  async get(organizationId: string, memberId: string) {
    const membership = await this.prisma.client.membership.findFirst({
      where: { id: memberId, organizationId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (!membership) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Member not found');
    }
    return this.toMember(membership);
  }

  async updateRole(
    organizationId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
    actor: RequestUser,
    actorRole: string,
    meta: { ip?: string; ua?: string },
  ) {
    const membership = await this.findInOrg(organizationId, memberId);

    if (membership.role === OrganizationRole.OWNER && actorRole !== OrganizationRole.OWNER) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Only an owner can change an owner');
    }
    if (dto.role === OrganizationRole.OWNER && actorRole !== OrganizationRole.OWNER) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Only an owner can grant owner');
    }
    if (membership.role === OrganizationRole.OWNER && dto.role !== OrganizationRole.OWNER) {
      await this.assertNotLastOwner(organizationId);
    }

    const updated = await this.prisma.client.membership.update({
      where: { id: membership.id },
      data: { role: dto.role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    await this.audit.record({
      organizationId,
      actorUserId: actor.id,
      action: AuditAction.MEMBER_ROLE_CHANGE,
      resourceType: ResourceType.MEMBERSHIP,
      resourceId: membership.id,
      metadata: { userId: membership.userId, from: membership.role, to: dto.role },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });

    return {
      id: updated.id,
      role: updated.role,
      createdAt: updated.createdAt,
      user: updated.user,
    };
  }

  private toMember(membership: {
    id: string;
    role: string;
    createdAt: Date;
    user: { id: string; email: string; name: string };
  }) {
    return {
      id: membership.id,
      role: membership.role,
      createdAt: membership.createdAt,
      user: membership.user,
    };
  }

  async remove(
    organizationId: string,
    memberId: string,
    actor: RequestUser,
    actorRole: string,
    meta: { ip?: string; ua?: string },
  ) {
    const membership = await this.findInOrg(organizationId, memberId);
    if (membership.role === OrganizationRole.OWNER) {
      if (actorRole !== OrganizationRole.OWNER) {
        throw new AppError(403, ErrorCode.FORBIDDEN, 'Only an owner can remove an owner');
      }
      await this.assertNotLastOwner(organizationId);
    }

    await this.prisma.client.membership.delete({ where: { id: membership.id } });
    await this.audit.record({
      organizationId,
      actorUserId: actor.id,
      action: AuditAction.MEMBER_REMOVE,
      resourceType: ResourceType.MEMBERSHIP,
      resourceId: membership.id,
      metadata: { userId: membership.userId, role: membership.role },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return { success: true };
  }

  private async findInOrg(organizationId: string, memberId: string) {
    const membership = await this.prisma.client.membership.findFirst({
      where: { id: memberId, organizationId },
    });
    if (!membership) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Member not found');
    }
    return membership;
  }

  private async assertNotLastOwner(organizationId: string) {
    const owners = await this.prisma.client.membership.count({
      where: { organizationId, role: OrganizationRole.OWNER },
    });
    if (owners <= 1) {
      throw new AppError(409, ErrorCode.LAST_OWNER, 'Cannot remove or demote the last owner');
    }
  }
}
