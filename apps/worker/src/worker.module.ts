import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { QueueName } from '@saasforge/shared';
import { LoggerModule } from 'nestjs-pino';
import { PrismaService } from './database/prisma.service';
import { DevLoggerEmailSender } from './email/dev-logger.email-sender';
import { EMAIL_SENDER } from './email/email-sender';
import { HealthController } from './health/health.controller';
import { EmailProcessor } from './processors/email.processor';
import { MaintenanceProcessor } from './processors/maintenance.processor';
import { RepeatableJobsService } from './processors/repeatable-jobs.service';
import { UsageProcessor } from './processors/usage.processor';

function parseRedisUrl(url: string): { host: string; port: number; password?: string } {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    password: parsed.password || undefined,
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
      },
    }),
    BullModule.forRoot({
      connection: parseRedisUrl(process.env.REDIS_URL ?? 'redis://localhost:6379'),
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    }),
    BullModule.registerQueue(
      { name: QueueName.EMAIL },
      { name: QueueName.USAGE },
      { name: QueueName.MAINTENANCE },
    ),
  ],
  controllers: [HealthController],
  providers: [
    PrismaService,
    EmailProcessor,
    UsageProcessor,
    MaintenanceProcessor,
    RepeatableJobsService,
    { provide: EMAIL_SENDER, useClass: DevLoggerEmailSender },
  ],
})
export class WorkerModule {}
