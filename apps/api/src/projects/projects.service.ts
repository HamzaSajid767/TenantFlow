import { Injectable } from '@nestjs/common';
import { AuditAction, ErrorCode, ResourceType } from '@saasforge/shared';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { paginationArgs, paginated, PaginationQueryDto } from '../common/dto/pagination.dto';
import type { RequestUser } from '../common/decorators/current-user.decorator';
import { AppError } from '../common/errors/app.error';
import { PrismaService } from '../database/prisma.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async create(
    organizationId: string,
    dto: CreateProjectDto,
    actor: RequestUser,
    meta: { ip?: string; ua?: string },
  ) {
    const project = await this.prisma.client.project.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
      },
    });
    await this.audit.record({
      organizationId,
      actorUserId: actor.id,
      action: AuditAction.PROJECT_CREATE,
      resourceType: ResourceType.PROJECT,
      resourceId: project.id,
      metadata: { name: project.name },
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return project;
  }

  async list(organizationId: string, query: PaginationQueryDto) {
    const { skip, take, page, limit } = paginationArgs(query);
    const where = { organizationId };
    const [data, total] = await this.prisma.client.$transaction([
      this.prisma.client.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.client.project.count({ where }),
    ]);
    return paginated(data, total, page, limit);
  }

  async get(organizationId: string, projectId: string) {
    const project = await this.prisma.client.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) {
      throw new AppError(404, ErrorCode.NOT_FOUND, 'Project not found');
    }
    return project;
  }

  async update(
    organizationId: string,
    projectId: string,
    dto: UpdateProjectDto,
    actor: RequestUser,
    meta: { ip?: string; ua?: string },
  ) {
    await this.get(organizationId, projectId);
    const project = await this.prisma.client.project.update({
      where: { id: projectId },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        status: dto.status,
      },
    });
    await this.audit.record({
      organizationId,
      actorUserId: actor.id,
      action: AuditAction.PROJECT_UPDATE,
      resourceType: ResourceType.PROJECT,
      resourceId: project.id,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return project;
  }

  async remove(
    organizationId: string,
    projectId: string,
    actor: RequestUser,
    meta: { ip?: string; ua?: string },
  ) {
    await this.get(organizationId, projectId);
    await this.prisma.client.project.delete({ where: { id: projectId } });
    await this.audit.record({
      organizationId,
      actorUserId: actor.id,
      action: AuditAction.PROJECT_DELETE,
      resourceType: ResourceType.PROJECT,
      resourceId: projectId,
      ipAddress: meta.ip,
      userAgent: meta.ua,
    });
    return { success: true };
  }
}
