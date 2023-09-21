import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { JobName, QueueName } from '@saasforge/shared';
import type { Queue } from 'bullmq';

@Injectable()
export class RepeatableJobsService implements OnModuleInit {
  constructor(
    @InjectQueue(QueueName.USAGE) private readonly usageQueue: Queue,
    @InjectQueue(QueueName.MAINTENANCE) private readonly maintenanceQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.usageQueue.add(
      JobName.AGGREGATE_DAILY,
      {},
      { repeat: { every: 60_000 }, jobId: JobName.AGGREGATE_DAILY },
    );
    await this.maintenanceQueue.add(
      JobName.EXPIRE_INVITATIONS,
      {},
      { repeat: { every: 15 * 60_000 }, jobId: JobName.EXPIRE_INVITATIONS },
    );
    await this.maintenanceQueue.add(
      JobName.PURGE_REFRESH_TOKENS,
      {},
      { repeat: { every: 60 * 60_000 }, jobId: JobName.PURGE_REFRESH_TOKENS },
    );
  }
}
