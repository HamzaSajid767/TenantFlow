import { IsEmail, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ORGANIZATION_ROLES, OrganizationRole, type OrganizationRole as Role } from '@saasforge/shared';

export class CreateInvitationDto {
  @ApiProperty({ example: 'dev@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: ORGANIZATION_ROLES, example: OrganizationRole.DEVELOPER })
  @IsIn(ORGANIZATION_ROLES)
  role!: Role;
}

export class InvitationTokenDto {
  @ApiProperty()
  token!: string;
}
