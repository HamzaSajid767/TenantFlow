import { randomUUID } from 'node:crypto';
import { ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { json } from 'express';
import type { Server } from 'node:http';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/database/prisma.service';

export type TestUser = {
  accessToken: string;
  user: { id: string; email: string; name: string };
  cookies: string[];
};

export async function createTestModule(): Promise<{
  module: TestingModule;
  app: Awaited<ReturnType<TestingModule['createNestApplication']>>;
  server: Server;
  prisma: PrismaService;
}> {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL =
    process.env.TEST_DATABASE_URL ??
    'postgresql://saasforge:saasforge@localhost:5432/saasforge_test?schema=public';
  process.env.WEB_ORIGIN = 'http://localhost:5173';
  process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
  process.env.JWT_ACCESS_SECRET = 'test-access-secret-test-access-secret';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-test-refresh-secret';
  process.env.API_KEY_PEPPER = 'test-api-key-pepper';
  process.env.APP_PUBLIC_URL = 'http://localhost:5173';
  process.env.API_KEY_RATE_LIMIT = '3';
  process.env.API_KEY_RATE_WINDOW_SEC = '60';
  process.env.COOKIE_SECURE = 'false';

  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = module.createNestApplication();
  app.use(cookieParser());
  app.use(json());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();

  return {
    module,
    app,
    server: app.getHttpServer() as Server,
    prisma: module.get(PrismaService),
  };
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.client.$executeRawUnsafe(`
    TRUNCATE TABLE
      audit_logs,
      usage_endpoint_rollups,
      usage_daily_rollups,
      usage_events,
      events,
      api_keys,
      projects,
      invitations,
      refresh_tokens,
      memberships,
      organizations,
      users
    RESTART IDENTITY CASCADE;
  `);
}

export async function registerUser(
  server: Server,
  overrides?: { email?: string; name?: string; password?: string },
): Promise<TestUser> {
  const email = overrides?.email ?? `user-${randomUUID()}@example.com`;
  const password = overrides?.password ?? 'supersecret1';
  const response = await request(server)
    .post('/auth/register')
    .send({ email, password, name: overrides?.name ?? 'Test User' })
    .expect(201);

  return {
    accessToken: response.body.accessToken as string,
    user: response.body.user as TestUser['user'],
    cookies: response.headers['set-cookie'] as unknown as string[],
  };
}

export function cookiesOf(response: { headers: { [key: string]: unknown } }): string[] {
  const value = response.headers['set-cookie'];
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

export function auth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
