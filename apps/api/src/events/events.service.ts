import { Injectable } from '@nestjs/common';
import { paginationArgs, paginated, PaginationQueryDto } from '../common/dto/pagination.dto';
import { PrismaService } from '../database/prisma.service';
import type { ApiKeyContext } from '../rate-limiting/api-key-auth.guard';
import { CreateEventDto } from './dto/event.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  create(apiKey: ApiKeyContext, dto: CreateEventDto) {
    return this.prisma.client.event.create({
      data: {
        organizationId: apiKey.organizationId,
        projectId: apiKey.projectId,
        apiKeyId: apiKey.id,
        type: dto.type,
        payload: (dto.payload ?? {}) as object,
      },
      select: {
        id: true,
        type: true,
        payload: true,
        createdAt: true,
        projectId: true,
      },
    });
  }

  async list(apiKey: ApiKeyContext, query: PaginationQueryDto) {
    const { skip, take, page, limit } = paginationArgs(query);
    const where = {
      organizationId: apiKey.organizationId,
      projectId: apiKey.projectId,
    };
    const [data, total] = await this.prisma.client.$transaction([
      this.prisma.client.event.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: { id: true, type: true, payload: true, createdAt: true, projectId: true },
      }),
      this.prisma.client.event.count({ where }),
    ]);
    return paginated(data, total, page, limit);
  }
}
