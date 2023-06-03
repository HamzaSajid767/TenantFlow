import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import {
  AuditAction,
  ErrorCode,
  InvitationStatus,
  JobName,
  OrganizationRole,
  QueueName,
  ResourceType,
  type SendInvitationJobData,
} from '@saasforge/shared';
import { IsString, MinLength } from 'class-validator';
import type { Queue } from 'bullmq';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { randomToken, sha256 } from '../common/crypto/crypto.util';
import type { RequestUser } from '../common/decorators/current-user.decorator';
import { AppError } from '../common/errors/app.error';
import type { EnvironmentVariables } from '../config/env';
import { PrismaService } from '../database/prisma.service';
import { CreateInvitationDto } from './dto/invitation.dto';

export class AcceptInvitationDto {
  @IsString()
  @MinLength(16)
  token!: string;
}

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    @InjectQueue(QueueName.EMAIL) private readonly emailQueue: Queue<SendInvitationJobData>,
  ) {}

  async create(
    organizationId: string,
    dto: CreateInvitationDto,
    actor: RequestUser,
    actorRole: string,
    meta: { ip?: string; ua?: string },
  ) {
    if (dto.role === OrganizationRole.OWNER && actorRole !== OrganizationRole.OWNER) {
      throw new AppError(403, ErrorCode.FORBIDDEN, 'Only an owner can invite another owner');
    }

    const email = dto.email.toLowerCase().trim();
    const organization = await this.prisma.client.organization.findUniqueOrThrow({
      where: { id: organizationId },
    });

    const existingMember = await this.prisma.client.user.findUnique({
      where: { email },
      include: { memberships: { where: { organizationId } } },
    });
    if (existingMember && existingMember.memberships.length > 0) {
      throw new AppError(409, ErrorCode.CONFLICT, 'User is already a member of this organization');
    }

    const pending = await this.prisma.client.invitation.findFirst({
      where: { organizationId, email, status: InvitationStatus.PENDING },
    });
    if (pending) {
      throw new AppError(409, ErrorCode.CONFLICT, 'An active invitation already exists for this email');
    }

    const token = randomToken(32);
    const hours = this.config.get('INVITATION_TTL_HOURS', { infer: true });
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    const invitation = await this.prisma.client.invitation.create({
      data: {
        organizationId,
        email,
        role: dto.role,
        tokenHash: sha256(token),
        expiresAt,
        invitedByUserId: actor.id,
      },
    });

    await this.emailQueue.add(
      JobName.SEND_INVITATION,
      {
        invitationId: invitation.id,
        organizationName: organization.name,
        email,
        role: dto.role,
        token,
        expiresAt: expiresAt.toISOString(),
      },
      { jobId: `invite-email-${invitation.id}` },
    );

    await this.audit.record({
      organizationId,
      actorUserId: actor.id,
      action: AuditAction.MEMBER_INVITE,
      resourceType: ResourceType.INVITATION,
      resourceId: invitation.id,
      metadata: { email, role: dto.role },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    };
  }

  async list(organizationId: string) {
    const invitations = await this.prisma.client.invitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        acceptedAt: true,
      },
    });
    return invitations;
  }

  async revoke(
    organizationId: string,
    invitationId: string,
    actor: RequestUser,
    meta: { ip?: string; ua?: string },
  ) {
    const invitation = await this.prisma.client.invitation.findFirst({
      where: { id: invitationId, organizationId },
    });
    if (!invitation) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Invitation not found');
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new AppError(409, ErrorCode.CONFLICT, 'Invitation is no longer pending');
    }
    await this.prisma.client.invitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.REVOKED },
    });
    await this.audit.record({
      organizationId,
      actorUserId: actor.id,
      action: AuditAction.INVITATION_REVOKE,
      resourceType: ResourceType.INVITATION,
      resourceId: invitation.id,
      metadata: { email: invitation.email },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return { success: true };
  }

  async accept(token: string, user: RequestUser, meta: { ip?: string; ua?: string }) {
    const invitation = await this.prisma.client.invitation.findFirst({
      where: { tokenHash: sha256(token) },
    });
    if (!invitation || invitation.status === InvitationStatus.REVOKED) {
      throw new AppError(400, ErrorCode.INVITATION_INVALID, 'Invitation is invalid');
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new AppError(400, ErrorCode.INVITATION_INVALID, 'Invitation is no longer pending');
    }
    if (invitation.expiresAt.getTime() < Date.now()) {
      await this.prisma.client.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.EXPIRED },
      });
      throw new AppError(400, ErrorCode.INVITATION_EXPIRED, 'Invitation has expired');
    }
    if (invitation.email !== user.email) {
      throw new AppError(
        403,
        ErrorCode.INVITATION_EMAIL_MISMATCH,
        'This invitation was issued to a different email address',
      );
    }

    await this.prisma.client.$transaction(async (tx) => {
      await tx.membership.upsert({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: invitation.organizationId,
          },
        },
        update: {},
        create: {
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: InvitationStatus.ACCEPTED, acceptedAt: new Date() },
      });
    });

    await this.audit.record({
      organizationId: invitation.organizationId,
      actorUserId: user.id,
      action: AuditAction.INVITATION_ACCEPT,
      resourceType: ResourceType.INVITATION,
      resourceId: invitation.id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });

    return { organizationId: invitation.organizationId, role: invitation.role };
  }

  async reject(token: string, user: RequestUser) {
    const invitation = await this.prisma.client.invitation.findFirst({
      where: { tokenHash: sha256(token), status: InvitationStatus.PENDING },
    });
    if (!invitation) {
      throw new AppError(400, ErrorCode.INVITATION_INVALID, 'Invitation is invalid');
    }
    if (invitation.email !== user.email) {
      throw new AppError(
        403,
        ErrorCode.INVITATION_EMAIL_MISMATCH,
        'This invitation was issued to a different email address',
      );
    }
    await this.prisma.client.invitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.REVOKED },
    });
    return { success: true };
  }
}
