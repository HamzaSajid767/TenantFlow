import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '@saasforge/shared';
import type { Request, Response } from 'express';
import { apiKeyMatches, parseApiKeyPrefix } from '../api-keys/api-key.crypto';
import { AppError } from '../common/errors/app.error';
import type { EnvironmentVariables } from '../config/env';
import { PrismaService } from '../database/prisma.service';
import { RateLimitService } from './rate-limit.service';

export type ApiKeyContext = {
  id: string;
  organizationId: string;
  projectId: string;
  prefix: string;
};

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly rateLimit: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { apiKey?: ApiKeyContext }>();
    const response = context.switchToHttp().getResponse<Response>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(401, ErrorCode.API_KEY_INVALID, 'API key required');
    }
    const secret = header.slice('Bearer '.length).trim();
    const prefix = parseApiKeyPrefix(secret);
    if (!prefix) {
      throw new AppError(401, ErrorCode.API_KEY_INVALID, 'API key required');
    }

    const record = await this.prisma.client.apiKey.findUnique({
      where: { keyPrefix: prefix },
      include: { project: true },
    });
    const pepper = this.config.get('API_KEY_PEPPER', { infer: true });
    if (!record || !apiKeyMatches(pepper, secret, record.keyHash)) {
      throw new AppError(401, ErrorCode.API_KEY_INVALID, 'API key required');
    }
    if (record.revokedAt) {
      throw new AppError(401, ErrorCode.API_KEY_REVOKED, 'API key has been revoked');
    }
    if (!record.project) {
      throw new AppError(401, ErrorCode.API_KEY_INVALID, 'API key required');
    }

    const limit = await this.rateLimit.consumeApiKey(record.id);
    response.setHeader('X-RateLimit-Limit', String(limit.limit));
    response.setHeader('X-RateLimit-Remaining', String(limit.remaining));
    if (!limit.allowed) {
      response.setHeader('Retry-After', String(limit.retryAfterSeconds));
      throw new AppError(429, ErrorCode.RATE_LIMITED, 'API rate limit exceeded');
    }

    request.apiKey = {
      id: record.id,
      organizationId: record.organizationId,
      projectId: record.projectId,
      prefix: record.keyPrefix,
    };

    void this.prisma.client.apiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    });

    return true;
  }
}
