import { Module } from '@nestjs/common';
import { ApiKeyAuthGuard } from './api-key-auth.guard';
import { RateLimitService } from './rate-limit.service';

@Module({
  providers: [RateLimitService, ApiKeyAuthGuard],
  exports: [RateLimitService, ApiKeyAuthGuard],
})
export class RateLimitingModule {}
