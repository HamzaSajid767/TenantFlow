import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export function paginationArgs(query: PaginationQueryDto): {
  skip: number;
  take: number;
  page: number;
  limit: number;
} {
  const page = query.page || 1;
  const limit = query.limit || 20;
  return { skip: (page - 1) * limit, take: limit, page, limit };
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): { data: T[]; meta: { page: number; limit: number; total: number } } {
  return { data, meta: { page, limit, total } };
}
