import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { WorkerModule } from './worker.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(WorkerModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  const port = Number(process.env.WORKER_HEALTH_PORT ?? 3001);
  await app.listen(port);
}

void bootstrap();
