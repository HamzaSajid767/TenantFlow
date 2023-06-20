import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permission } from '@saasforge/shared';
import type { Request } from 'express';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator';
import { clientIp } from '../common/crypto/crypto.util';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { OrgMemberGuard } from '../common/guards/org-member.guard';
import { OrgPermissionsGuard } from '../common/guards/org-permissions.guard';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(OrgMemberGuard, OrgPermissionsGuard)
@Controller('organizations/:id/projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @RequirePermissions(Permission.PROJECT_CREATE)
  @Post()
  create(
    @Param('id') organizationId: string,
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.projects.create(organizationId, dto, user, this.meta(req));
  }

  @RequirePermissions(Permission.PROJECT_READ)
  @Get()
  list(@Param('id') organizationId: string, @Query() query: PaginationQueryDto) {
    return this.projects.list(organizationId, query);
  }

  @RequirePermissions(Permission.PROJECT_READ)
  @Get(':projectId')
  get(@Param('id') organizationId: string, @Param('projectId') projectId: string) {
    return this.projects.get(organizationId, projectId);
  }

  @RequirePermissions(Permission.PROJECT_UPDATE)
  @Patch(':projectId')
  update(
    @Param('id') organizationId: string,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.projects.update(organizationId, projectId, dto, user, this.meta(req));
  }

  @RequirePermissions(Permission.PROJECT_DELETE)
  @Delete(':projectId')
  remove(
    @Param('id') organizationId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    return this.projects.remove(organizationId, projectId, user, this.meta(req));
  }

  private meta(req: Request) {
    return {
      ip: clientIp(req.headers as Record<string, unknown>, req.ip),
      ua: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined,
    };
  }
}
