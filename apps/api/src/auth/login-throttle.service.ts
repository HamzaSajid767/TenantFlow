import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '@saasforge/shared';
import type Redis from 'ioredis';
import { AppError } from '../common/errors/app.error';
import type { EnvironmentVariables } from '../config/env';
import { REDIS } from '../redis/redis.constants';

@Injectable()
export class LoginThrottleService {
  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async assertAllowed(email: string, ip: string): Promise<void> {
    const key = this.key(email, ip);
    const attempts = Number((await this.redis.get(key)) ?? 0);
    const max = this.config.get('LOGIN_MAX_ATTEMPTS', { infer: true });
    if (attempts >= max) {
      throw new AppError(
        429,
        ErrorCode.RATE_LIMITED,
        'Too many login attempts. Try again later.',
      );
    }
  }

  async recordFailure(email: string, ip: string): Promise<void> {
    const key = this.key(email, ip);
    const windowSec = this.config.get('LOGIN_WINDOW_SEC', { infer: true });
    const attempts = await this.redis.incr(key);
    if (attempts === 1) {
      await this.redis.expire(key, windowSec);
    }
  }

  async clear(email: string, ip: string): Promise<void> {
    await this.redis.del(this.key(email, ip));
  }

  private key(email: string, ip: string): string {
    return `login:fail:${email.toLowerCase()}:${ip}`;
  }
}
