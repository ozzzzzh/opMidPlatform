import { Priority, TicketCategory, TicketSource, TicketStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class QueryTicketsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100, { message: 'pageSize 不能超过 100' })
  pageSize: number = 20;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @IsOptional()
  @IsEnum(TicketStatus, { message: '状态不合法' })
  status?: TicketStatus;

  @IsOptional()
  @IsEnum(TicketCategory, { message: '问题类型不合法' })
  category?: TicketCategory;

  @IsOptional()
  @IsEnum(Priority, { message: '优先级不合法' })
  priority?: Priority;

  @IsOptional()
  @IsEnum(TicketSource, { message: '来源不合法' })
  source?: TicketSource;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsISO8601({}, { message: '开始时间格式不正确' })
  from?: string;

  @IsOptional()
  @IsISO8601({}, { message: '结束时间格式不正确' })
  to?: string;

  @IsOptional()
  @IsIn(['overdue', 'dueSoon', 'unassignedAging'], { message: '关注类型不合法' })
  attention?: 'overdue' | 'dueSoon' | 'unassignedAging';
}
