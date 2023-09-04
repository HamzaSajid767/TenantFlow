import { Controller, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { QueueName } from '@saasforge/shared';
import type { Queue } from 'bullmq';
import { PrismaService } from '../database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QueueName.EMAIL) private readonly emailQueue: Queue,
  ) {}

  @Get()
  async check() {
    let database: 'up' | 'down' = 'down';
    let redis: 'up' | 'down' = 'down';
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      database = 'down';
    }
    try {
      await this.emailQueue.getJobCounts();
      redis = 'up';
    } catch {
      redis = 'down';
    }
    return {
      status: database === 'up' && redis === 'up' ? 'ok' : 'degraded',
      service: 'worker',
      checks: { database, redis },
    };
  }
}
