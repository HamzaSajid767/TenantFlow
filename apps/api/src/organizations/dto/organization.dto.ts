import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Inc' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}

export class UpdateOrganizationDto {
  @ApiPropertyOptional({ example: 'Acme Industries' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;
}
