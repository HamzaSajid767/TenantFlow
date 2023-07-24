import { Body, Controller, Get, Post, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiSecurity, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../common/decorators/auth.decorators';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { ApiKeyAuthGuard, type ApiKeyContext } from '../rate-limiting/api-key-auth.guard';
import { UsageInterceptor } from '../usage/usage.interceptor';
import { CreateEventDto } from './dto/event.dto';
import { EventsService } from './events.service';

@ApiTags('v1')
@ApiSecurity('apiKey')
@ApiBearerAuth()
@Public()
@UseGuards(ApiKeyAuthGuard)
@UseInterceptors(UsageInterceptor)
@Controller('v1/events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Post()
  create(@Body() dto: CreateEventDto, @Req() req: Request & { apiKey: ApiKeyContext }) {
    return this.events.create(req.apiKey, dto);
  }

  @Get()
  list(
    @Query() query: PaginationQueryDto,
    @Req() req: Request & { apiKey: ApiKeyContext },
  ) {
    return this.events.list(req.apiKey, query);
  }
}
