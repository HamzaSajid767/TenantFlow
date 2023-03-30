import { Global, Inject, Injectable, Module, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { EnvironmentVariables } from '../config/env';
import { REDIS } from './redis.constants';

@Injectable()
class RedisShutdown implements OnModuleDestroy {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  onModuleDestroy(): void {
    this.redis.disconnect();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>): Redis => {
        return new Redis(config.get('REDIS_URL', { infer: true }), {
          maxRetriesPerRequest: null,
        });
      },
    },
    RedisShutdown,
  ],
  exports: [REDIS],
})
export class RedisModule {}
