import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { JobName, QueueName, type RecordUsageJobData } from '@saasforge/shared';
import type { Queue } from 'bullmq';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import type { ApiKeyContext } from '../rate-limiting/api-key-auth.guard';

@Injectable()
export class UsageInterceptor implements NestInterceptor {
  constructor(
    @InjectQueue(QueueName.USAGE) private readonly usageQueue: Queue<RecordUsageJobData>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const started = Date.now();
    const request = context.switchToHttp().getRequest<Request & { apiKey?: ApiKeyContext; id?: string }>();
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      tap({
        finalize: () => {
          const apiKey = request.apiKey;
          if (!apiKey) {
            return;
          }
          const requestId = String(request.id ?? `${apiKey.id}-${started}`);
          void this.usageQueue.add(
            JobName.RECORD_USAGE,
            {
              requestId,
              organizationId: apiKey.organizationId,
              projectId: apiKey.projectId,
              apiKeyId: apiKey.id,
              endpoint: request.route?.path ?? request.path,
              method: request.method,
              statusCode: response.statusCode,
              responseTimeMs: Date.now() - started,
              occurredAt: new Date(started).toISOString(),
            },
            { jobId: `usage-${requestId}` },
          );
        },
      }),
    );
  }
}
