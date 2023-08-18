import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './database/prisma.module';
import { EventsModule } from './events/events.module';
import { HealthModule } from './health/health.module';
import { InvitationsModule } from './invitations/invitations.module';
import { MembershipsModule } from './memberships/memberships.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProjectsModule } from './projects/projects.module';
import { QueueModule } from './queue/queue.module';
import { RateLimitingModule } from './rate-limiting/rate-limiting.module';
import { RedisModule } from './redis/redis.module';
import { UsageModule } from './usage/usage.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req, res) => {
          const existing = req.headers['x-request-id'];
          const id = typeof existing === 'string' && existing.length > 0 ? existing : randomUUID();
          res.setHeader('x-request-id', id);
          return id;
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.body.password',
            'req.body.token',
            'req.body.secret',
          ],
          censor: '[Redacted]',
        },
        transport:
          process.env.NODE_ENV === 'development' ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
      },
    }),
    PrismaModule,
    RedisModule,
    QueueModule,
    AuthModule,
    OrganizationsModule,
    MembershipsModule,
    InvitationsModule,
    ProjectsModule,
    ApiKeysModule,
    EventsModule,
    UsageModule,
    AuditLogsModule,
    RateLimitingModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
