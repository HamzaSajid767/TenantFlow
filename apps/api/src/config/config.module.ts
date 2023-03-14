import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { EnvironmentVariables } from './env';

function validate(config: Record<string, unknown>): EnvironmentVariables {
  const normalized = {
    ...config,
    WEB_ORIGIN: config.WEB_ORIGIN ?? config.CORS_ORIGIN,
    JWT_ACCESS_TTL_SECONDS: config.JWT_ACCESS_TTL_SECONDS ?? config.JWT_ACCESS_EXPIRES_IN,
    REFRESH_TOKEN_TTL_SECONDS: config.REFRESH_TOKEN_TTL_SECONDS ?? config.JWT_REFRESH_EXPIRES_IN,
    EMAIL_DRIVER: config.EMAIL_DRIVER ?? config.EMAIL_PROVIDER,
  };
  const parsed = plainToInstance(EnvironmentVariables, normalized, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(parsed, { skipMissingProperties: false });
  if (errors.length > 0) {
    const messages = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Invalid environment: ${messages}`);
  }
  return parsed;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      ignoreEnvFile: process.env.NODE_ENV === 'test',
      envFilePath: ['.env', '../../.env'],
      validate,
    }),
  ],
})
export class AppConfigModule {}
