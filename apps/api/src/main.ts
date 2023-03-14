import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { json } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import type { EnvironmentVariables } from './config/env';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const config = app.get(ConfigService<EnvironmentVariables, true>);

  app.use(helmet());
  app.use(cookieParser());
  app.use(json({ limit: '32kb' }));
  app.enableCors({
    origin: config.get('WEB_ORIGIN', { infer: true }),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const swagger = new DocumentBuilder()
    .setTitle('SaaSForge API')
    .setDescription('Multi-tenant SaaS API platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'Authorization', in: 'header' }, 'apiKey')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger));

  const port = config.get('API_PORT', { infer: true });
  await app.listen(port);
}

void bootstrap();
