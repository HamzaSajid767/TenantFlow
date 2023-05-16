import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ORGANIZATION_ROLES, type OrganizationRole } from '@saasforge/shared';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ORGANIZATION_ROLES })
  @IsIn(ORGANIZATION_ROLES)
  role!: OrganizationRole;
}
