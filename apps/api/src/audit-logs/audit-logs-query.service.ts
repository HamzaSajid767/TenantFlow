import { Injectable } from '@nestjs/common';
import { Prisma } from '@saasforge/database';
import { paginationArgs, paginated } from '../common/dto/pagination.dto';
import { PrismaService } from '../database/prisma.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@Injectable()
export class AuditLogsQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, query: AuditLogQueryDto) {
    const { skip, take, page, limit } = paginationArgs(query);
    const where: Prisma.AuditLogWhereInput = {
      organizationId,
      action: query.action,
      resourceType: query.resourceType,
    };
    const [data, total] = await this.prisma.client.$transaction([
      this.prisma.client.auditLog.findMany({
        where,
        orderBy: { createdAt: query.sort === 'asc' ? 'asc' : 'desc' },
        skip,
        take,
        select: {
          id: true,
          action: true,
          resourceType: true,
          resourceId: true,
          metadata: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          actorUserId: true,
          actor: { select: { id: true, email: true, name: true } },
        },
      }),
      this.prisma.client.auditLog.count({ where }),
    ]);
    return paginated(data, total, page, limit);
  }
}
