import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '@saasforge/shared';
import type Redis from 'ioredis';
import { AppError } from '../common/errors/app.error';
import type { EnvironmentVariables } from '../config/env';
import { REDIS } from '../redis/redis.constants';
import { consumeTokenBucket, type RateLimitResult } from './token-bucket';

@Injectable()
export class RateLimitService {
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async consumeApiKey(apiKeyId: string): Promise<RateLimitResult> {
    const limit = this.config.get('API_KEY_RATE_LIMIT', { infer: true });
    const windowSec = this.config.get('API_KEY_RATE_WINDOW_SEC', { infer: true });
    try {
      return await consumeTokenBucket(this.redis, `rl:apikey:${apiKeyId}`, limit, windowSec);
    } catch {
      throw new AppError(
        503,
        ErrorCode.DEPENDENCY_UNAVAILABLE,
        'Rate limiter unavailable',
      );
    }
  }

  async consumeIp(ip: string): Promise<RateLimitResult | null> {
    const limit = this.config.get('JWT_IP_RATE_LIMIT', { infer: true });
    const windowSec = this.config.get('JWT_IP_RATE_WINDOW_SEC', { infer: true });
    try {
      return await consumeTokenBucket(this.redis, `rl:ip:${ip}`, limit, windowSec);
    } catch {
      return null;
    }
  }
}
