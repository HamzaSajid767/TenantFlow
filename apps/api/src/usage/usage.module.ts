import { Module } from '@nestjs/common';
import { UsageController } from './usage.controller';
import { UsageInterceptor } from './usage.interceptor';
import { UsageService } from './usage.service';

@Module({
  controllers: [UsageController],
  providers: [UsageService, UsageInterceptor],
  exports: [UsageInterceptor],
})
export class UsageModule {}
