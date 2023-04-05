import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { REFRESH_COOKIE_NAME } from '@saasforge/shared';
import type { CookieOptions, Response } from 'express';
import type { EnvironmentVariables } from '../config/env';
import { hmacSha256, randomToken } from '../common/crypto/crypto.util';
import { PrismaService } from '../database/prisma.service';

export type TokenPair = {
  accessToken: string;
  expiresIn: number;
};

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  hashRefreshToken(raw: string): string {
    return hmacSha256(this.config.get('JWT_REFRESH_SECRET', { infer: true }), raw);
  }

  async issueSession(
    user: { id: string; email: string },
    meta: { ipAddress?: string; userAgent?: string },
    familyId: string = randomUUID(),
  ): Promise<{ tokens: TokenPair; refreshToken: string }> {
    const accessTtl = this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true });
    const refreshTtl = this.config.get('REFRESH_TOKEN_TTL_SECONDS', { infer: true });
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      { expiresIn: accessTtl, jwtid: randomUUID() },
    );

    const refreshToken = randomToken(32);
    await this.prisma.client.refreshToken.create({
      data: {
        userId: user.id,
        familyId,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    return { tokens: { accessToken, expiresIn: accessTtl }, refreshToken };
  }

  setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, this.cookieOptions());
  }

  clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, this.cookieOptions());
  }

  private cookieOptions(): CookieOptions {
    const sameSite = this.config.get('COOKIE_SAMESITE', { infer: true });
    return {
      httpOnly: true,
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      sameSite,
      path: '/auth',
      maxAge: this.config.get('REFRESH_TOKEN_TTL_SECONDS', { infer: true }) * 1000,
    };
  }
}
