import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  async stats(organizationId: string) {
    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const startOfRange = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 13));

    const [today, month, byEndpoint, overTime] = await Promise.all([
      this.prisma.client.usageDailyRollup.aggregate({
        where: { organizationId, date: { gte: startOfToday } },
        _sum: {
          requestCount: true,
          successCount: true,
          failureCount: true,
          totalResponseTimeMs: true,
        },
      }),
      this.prisma.client.usageDailyRollup.aggregate({
        where: { organizationId, date: { gte: startOfMonth } },
        _sum: {
          requestCount: true,
          successCount: true,
          failureCount: true,
          totalResponseTimeMs: true,
        },
      }),
      this.prisma.client.usageEndpointRollup.groupBy({
        by: ['method', 'endpoint'],
        where: { organizationId, date: { gte: startOfMonth } },
        _sum: { requestCount: true, totalResponseTimeMs: true },
        orderBy: { _sum: { requestCount: 'desc' } },
        take: 10,
      }),
      this.prisma.client.usageDailyRollup.groupBy({
        by: ['date'],
        where: { organizationId, date: { gte: startOfRange } },
        _sum: { requestCount: true, successCount: true, failureCount: true },
        orderBy: { date: 'asc' },
      }),
    ]);

    const avg = (totalMs: bigint | number | null | undefined, count: number | null | undefined) => {
      const total = Number(totalMs ?? 0);
      const n = count ?? 0;
      return n === 0 ? 0 : Math.round(total / n);
    };

    return {
      today: {
        requests: today._sum.requestCount ?? 0,
        successful: today._sum.successCount ?? 0,
        failed: today._sum.failureCount ?? 0,
        averageResponseTimeMs: avg(today._sum.totalResponseTimeMs, today._sum.requestCount),
      },
      month: {
        requests: month._sum.requestCount ?? 0,
        successful: month._sum.successCount ?? 0,
        failed: month._sum.failureCount ?? 0,
        averageResponseTimeMs: avg(month._sum.totalResponseTimeMs, month._sum.requestCount),
      },
      byEndpoint: byEndpoint.map((row) => ({
        method: row.method,
        endpoint: row.endpoint,
        requests: row._sum.requestCount ?? 0,
        averageResponseTimeMs: avg(row._sum.totalResponseTimeMs, row._sum.requestCount),
      })),
      overTime: overTime.map((row) => ({
        date: row.date,
        requests: row._sum.requestCount ?? 0,
        successful: row._sum.successCount ?? 0,
        failed: row._sum.failureCount ?? 0,
      })),
    };
  }
}
