import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPrismaClient, type PrismaClient } from '@saasforge/database';
import type { EnvironmentVariables } from '../config/env';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client: PrismaClient;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.client = createPrismaClient(config.get('DATABASE_URL', { infer: true }));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
