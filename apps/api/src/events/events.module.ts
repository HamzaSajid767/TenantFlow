import { Module } from '@nestjs/common';
import { RateLimitingModule } from '../rate-limiting/rate-limiting.module';
import { UsageInterceptor } from '../usage/usage.interceptor';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [RateLimitingModule],
  controllers: [EventsController],
  providers: [EventsService, UsageInterceptor],
})
export class EventsModule {}
