import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission } from '@saasforge/shared';
import type { Request } from 'express';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator';
import { clientIp } from '../common/crypto/crypto.util';
import { OrgMemberGuard } from '../common/guards/org-member.guard';
import { OrgPermissionsGuard } from '../common/guards/org-permissions.guard';
import { CreateApiKeyDto } from './api-key.crypto';
import { ApiKeysService } from './api-keys.service';

@ApiTags('api-keys')
@ApiBearerAuth()
@UseGuards(OrgMemberGuard, OrgPermissionsGuard)
@Controller('organizations/:id/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @RequirePermissions(Permission.API_KEY_CREATE)
  @Post()
  create(
    @Param('id') organizationId: string,
    @Body() dto: CreateApiKeyDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.apiKeys.create(organizationId, dto, user, this.meta(req));
  }

  @RequirePermissions(Permission.API_KEY_READ)
  @Get()
  list(@Param('id') organizationId: string) {
    return this.apiKeys.list(organizationId);
  }

  @RequirePermissions(Permission.API_KEY_REVOKE)
  @Delete(':keyId')
  revoke(
    @Param('id') organizationId: string,
    @Param('keyId') keyId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.apiKeys.revoke(organizationId, keyId, user, this.meta(req));
  }

  private meta(req: Request) {
    return {
      ip: clientIp(req.headers as Record<string, unknown>, req.ip),
      ua: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    };
  }
}
