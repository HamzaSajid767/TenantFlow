import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { JobName, QueueName, type RecordUsageJobData } from '@saasforge/shared';
import type { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';

@Processor(QueueName.USAGE)
export class UsageProcessor extends WorkerHost {
  private readonly logger = new Logger(UsageProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<RecordUsageJobData | Record<string, never>>): Promise<void> {
    if (job.name === JobName.RECORD_USAGE) {
      await this.record(job.data as RecordUsageJobData);
      return;
    }
    if (job.name === JobName.AGGREGATE_DAILY) {
      await this.aggregate();
    }
  }

  private async record(data: RecordUsageJobData): Promise<void> {
    await this.prisma.client.usageEvent.upsert({
      where: { requestId: data.requestId },
      create: {
        requestId: data.requestId,
        organizationId: data.organizationId,
        projectId: data.projectId,
        apiKeyId: data.apiKeyId,
        endpoint: data.endpoint,
        method: data.method,
        statusCode: data.statusCode,
        responseTimeMs: data.responseTimeMs,
        createdAt: new Date(data.occurredAt),
      },
      update: {},
    });
  }

  private async aggregate(): Promise<void> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 2);
    const events = await this.prisma.client.usageEvent.findMany({
      where: { createdAt: { gte: since } },
      select: {
        organizationId: true,
        projectId: true,
        endpoint: true,
        method: true,
        statusCode: true,
        responseTimeMs: true,
        createdAt: true,
      },
    });

    const daily = new Map<
      string,
      {
        organizationId: string;
        projectId: string;
        date: Date;
        requestCount: number;
        successCount: number;
        failureCount: number;
        totalResponseTimeMs: number;
      }
    >();
    const endpoints = new Map<
      string,
      {
        organizationId: string;
        date: Date;
        method: string;
        endpoint: string;
        requestCount: number;
        totalResponseTimeMs: number;
      }
    >();

    for (const event of events) {
      const day = new Date(
        Date.UTC(event.createdAt.getUTCFullYear(), event.createdAt.getUTCMonth(), event.createdAt.getUTCDate()),
      );
      const dayKey = `${event.organizationId}:${event.projectId}:${day.toISOString()}`;
      const dailyRow = daily.get(dayKey) ?? {
        organizationId: event.organizationId,
        projectId: event.projectId,
        date: day,
        requestCount: 0,
        successCount: 0,
        failureCount: 0,
        totalResponseTimeMs: 0,
      };
      dailyRow.requestCount += 1;
      dailyRow.totalResponseTimeMs += event.responseTimeMs;
      if (event.statusCode < 400) {
        dailyRow.successCount += 1;
      } else {
        dailyRow.failureCount += 1;
      }
      daily.set(dayKey, dailyRow);

      const endpointKey = `${event.organizationId}:${day.toISOString()}:${event.method}:${event.endpoint}`;
      const endpointRow = endpoints.get(endpointKey) ?? {
        organizationId: event.organizationId,
        date: day,
        method: event.method,
        endpoint: event.endpoint,
        requestCount: 0,
        totalResponseTimeMs: 0,
      };
      endpointRow.requestCount += 1;
      endpointRow.totalResponseTimeMs += event.responseTimeMs;
      endpoints.set(endpointKey, endpointRow);
    }

    for (const row of daily.values()) {
      await this.prisma.client.usageDailyRollup.upsert({
        where: {
          organizationId_projectId_date: {
            organizationId: row.organizationId,
            projectId: row.projectId,
            date: row.date,
          },
        },
        create: {
          organizationId: row.organizationId,
          projectId: row.projectId,
          date: row.date,
          requestCount: row.requestCount,
          successCount: row.successCount,
          failureCount: row.failureCount,
          totalResponseTimeMs: BigInt(row.totalResponseTimeMs),
        },
        update: {
          requestCount: row.requestCount,
          successCount: row.successCount,
          failureCount: row.failureCount,
          totalResponseTimeMs: BigInt(row.totalResponseTimeMs),
        },
      });
    }

    for (const row of endpoints.values()) {
      await this.prisma.client.usageEndpointRollup.upsert({
        where: {
          organizationId_date_method_endpoint: {
            organizationId: row.organizationId,
            date: row.date,
            method: row.method,
            endpoint: row.endpoint,
          },
        },
        create: {
          organizationId: row.organizationId,
          date: row.date,
          method: row.method,
          endpoint: row.endpoint,
          requestCount: row.requestCount,
          totalResponseTimeMs: BigInt(row.totalResponseTimeMs),
        },
        update: {
          requestCount: row.requestCount,
          totalResponseTimeMs: BigInt(row.totalResponseTimeMs),
        },
      });
    }

    this.logger.log(`Aggregated ${events.length} usage events`);
  }
}
