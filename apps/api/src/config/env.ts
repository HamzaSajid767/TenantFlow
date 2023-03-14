import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform } from 'class-transformer';

function toInt(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  if (typeof value === 'number') {
    return value;
  }
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export class EnvironmentVariables {
  @IsOptional()
  @IsString()
  NODE_ENV: string = 'development';

  @IsOptional()
  @IsString()
  APP_NAME: string = 'SaaSForge';

  @Transform(({ value }) => toInt(value, 3000))
  @IsInt()
  @Min(1)
  API_PORT: number = 3000;

  @IsString()
  WEB_ORIGIN!: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @IsOptional()
  @IsString()
  LOG_LEVEL: string = 'info';

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  REDIS_URL!: string;

  @IsString()
  JWT_ACCESS_SECRET!: string;

  @IsString()
  JWT_REFRESH_SECRET!: string;

  @Transform(({ value }) => toInt(value, 900))
  @IsInt()
  JWT_ACCESS_TTL_SECONDS: number = 900;

  @Transform(({ value }) => toInt(value, 900))
  @IsInt()
  JWT_ACCESS_EXPIRES_IN: number = 900;

  @Transform(({ value }) => toInt(value, 1_209_600))
  @IsInt()
  REFRESH_TOKEN_TTL_SECONDS: number = 1_209_600;

  @Transform(({ value }) => toInt(value, 1_209_600))
  @IsInt()
  JWT_REFRESH_EXPIRES_IN: number = 1_209_600;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  COOKIE_SECURE: boolean = false;

  @IsOptional()
  @IsString()
  COOKIE_SAMESITE: 'lax' | 'strict' | 'none' = 'lax';

  @IsString()
  API_KEY_PEPPER!: string;

  @Transform(({ value }) => toInt(value, 60))
  @IsInt()
  API_KEY_RATE_LIMIT: number = 60;

  @Transform(({ value }) => toInt(value, 60))
  @IsInt()
  API_KEY_RATE_WINDOW_SEC: number = 60;

  @Transform(({ value }) => toInt(value, 120))
  @IsInt()
  JWT_IP_RATE_LIMIT: number = 120;

  @Transform(({ value }) => toInt(value, 60))
  @IsInt()
  JWT_IP_RATE_WINDOW_SEC: number = 60;

  @Transform(({ value }) => toInt(value, 5))
  @IsInt()
  LOGIN_MAX_ATTEMPTS: number = 5;

  @Transform(({ value }) => toInt(value, 900))
  @IsInt()
  LOGIN_WINDOW_SEC: number = 900;

  @Transform(({ value }) => toInt(value, 72))
  @IsInt()
  INVITATION_TTL_HOURS: number = 72;

  @IsString()
  APP_PUBLIC_URL!: string;

  @IsOptional()
  @IsString()
  EMAIL_DRIVER: string = 'development';

  @IsOptional()
  @IsString()
  EMAIL_PROVIDER: string = 'development';

  @IsOptional()
  @IsString()
  EMAIL_FROM: string = 'noreply@saasforge.local';
}

export type AppConfig = EnvironmentVariables;
