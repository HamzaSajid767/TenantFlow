import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/auth.decorators';
import { PrismaService } from '../database/prisma.service';
import { Inject } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS } from '../redis/redis.constants';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Public()
  @Get()
  async check() {
    const [database, redis] = await Promise.all([this.checkDatabase(), this.checkRedis()]);
    const healthy = database === 'up' && redis === 'up';
    return {
      status: healthy ? 'ok' : 'degraded',
      checks: { database, redis },
    };
  }

  private async checkDatabase(): Promise<'up' | 'down'> {
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async checkRedis(): Promise<'up' | 'down'> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }
}
