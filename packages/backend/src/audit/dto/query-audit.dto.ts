import { Type } from 'class-transformer';
import { IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class QueryAuditDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200, { message: 'pageSize 不能超过 200' })
  pageSize: number = 20;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  action?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  userId?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'from 必须是 ISO 8601 时间' })
  from?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'to 必须是 ISO 8601 时间' })
  to?: string;
}
