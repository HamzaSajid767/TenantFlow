import { Injectable } from '@nestjs/common';
import { AuditAction, ErrorCode, REFRESH_COOKIE_NAME, ResourceType } from '@saasforge/shared';
import type { Request, Response } from 'express';
import { AuditLogService } from '../audit-logs/audit-log.service';
import { clientIp } from '../common/crypto/crypto.util';
import type { RequestUser } from '../common/decorators/current-user.decorator';
import { AppError } from '../common/errors/app.error';
import { PrismaService } from '../database/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { LoginThrottleService } from './login-throttle.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly throttle: LoginThrottleService,
    private readonly audit: AuditLogService,
  ) {}

  async register(dto: RegisterDto, req: Request, res: Response) {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.client.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError(409, ErrorCode.EMAIL_TAKEN, 'An account with this email already exists');
    }

    const user = await this.prisma.client.user.create({
      data: {
        email,
        name: dto.name.trim(),
        passwordHash: await this.passwords.hash(dto.password),
      },
    });

    const result = await this.completeAuth(user, req, res);
    await this.audit.record({
      actorUserId: user.id,
      action: AuditAction.AUTH_REGISTER,
      resourceType: ResourceType.USER,
      resourceId: user.id,
      ipAddress: this.ip(req),
      userAgent: this.ua(req),
    });
    return result;
  }

  async login(dto: LoginDto, req: Request, res: Response) {
    const email = dto.email.toLowerCase().trim();
    const ip = this.ip(req) ?? 'unknown';
    await this.throttle.assertAllowed(email, ip);

    const user = await this.prisma.client.user.findUnique({ where: { email } });
    const valid = user ? await this.passwords.verify(user.passwordHash, dto.password) : false;
    if (!user || !valid) {
      await this.throttle.recordFailure(email, ip);
      throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Invalid email or password');
    }

    await this.throttle.clear(email, ip);
    const result = await this.completeAuth(user, req, res);
    await this.audit.record({
      actorUserId: user.id,
      action: AuditAction.AUTH_LOGIN,
      resourceType: ResourceType.USER,
      resourceId: user.id,
      ipAddress: this.ip(req),
      userAgent: this.ua(req),
    });
    return result;
  }

  async refresh(req: Request, res: Response) {
    const raw = this.readRefreshCookie(req);
    if (!raw) {
      throw new AppError(401, ErrorCode.UNAUTHENTICATED, 'Refresh token missing');
    }

    const tokenHash = this.tokens.hashRefreshToken(raw);
    const stored = await this.prisma.client.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new AppError(401, ErrorCode.UNAUTHENTICATED, 'Invalid refresh token');
    }

    if (stored.revokedAt) {
      if (stored.replacedById) {
        await this.prisma.client.refreshToken.updateMany({
          where: { familyId: stored.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      this.tokens.clearRefreshCookie(res);
      throw new AppError(401, ErrorCode.UNAUTHENTICATED, 'Refresh token reuse detected');
    }

    if (stored.expiresAt.getTime() < Date.now()) {
      this.tokens.clearRefreshCookie(res);
      throw new AppError(401, ErrorCode.UNAUTHENTICATED, 'Refresh token expired');
    }

    const { tokens, refreshToken } = await this.tokens.issueSession(
      stored.user,
      { ipAddress: this.ip(req), userAgent: this.ua(req) },
      stored.familyId,
    );

    const next = await this.prisma.client.refreshToken.findUniqueOrThrow({
      where: { tokenHash: this.tokens.hashRefreshToken(refreshToken) },
    });

    await this.prisma.client.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedById: next.id },
    });

    this.tokens.setRefreshCookie(res, refreshToken);
    return {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      user: this.toUser(stored.user),
    };
  }

  async logout(req: Request, res: Response, user: RequestUser) {
    const raw = this.readRefreshCookie(req);
    if (raw) {
      const stored = await this.prisma.client.refreshToken.findUnique({
        where: { tokenHash: this.tokens.hashRefreshToken(raw) },
      });
      if (stored) {
        await this.prisma.client.refreshToken.updateMany({
          where: { familyId: stored.familyId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
    }
    this.tokens.clearRefreshCookie(res);
    await this.audit.record({
      actorUserId: user.id,
      action: AuditAction.AUTH_LOGOUT,
      resourceType: ResourceType.USER,
      resourceId: user.id,
      ipAddress: this.ip(req),
      userAgent: this.ua(req),
    });
    return { success: true };
  }

  async me(user: RequestUser) {
    const record = await this.prisma.client.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    return record;
  }

  private async completeAuth(
    user: { id: string; email: string; name: string },
    req: Request,
    res: Response,
  ) {
    const { tokens, refreshToken } = await this.tokens.issueSession(user, {
      ipAddress: this.ip(req),
      userAgent: this.ua(req),
    });
    this.tokens.setRefreshCookie(res, refreshToken);
    return {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      user: this.toUser(user),
    };
  }

  private toUser(user: { id: string; email: string; name?: string }) {
    return { id: user.id, email: user.email, name: user.name };
  }

  private readRefreshCookie(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, string> | undefined;
    return cookies?.[REFRESH_COOKIE_NAME];
  }

  private ip(req: Request): string | undefined {
    return clientIp(req.headers as Record<string, unknown>, req.ip);
  }

  private ua(req: Request): string | undefined {
    const value = req.headers['user-agent'];
    return typeof value === 'string' ? value : undefined;
  }
}
