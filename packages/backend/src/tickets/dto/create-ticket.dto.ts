import { Priority, TicketCategory, TicketSource } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTicketDto {
  @IsEnum(TicketCategory, { message: '问题类型不合法' })
  category!: TicketCategory;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: '问题描述必须是字符串' })
  @MinLength(5, { message: '问题描述至少 5 个字符' })
  @MaxLength(5000, { message: '问题描述不能超过 5000 个字符' })
  description!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120, { message: '标题不能超过 120 个字符' })
  title?: string;

  @IsOptional()
  @IsEnum(Priority, { message: '优先级不合法' })
  priority?: Priority;

  @IsOptional()
  @IsEnum(TicketSource, { message: '来源不合法' })
  source?: TicketSource;

  @IsOptional()
  @IsISO8601({}, { message: '期望完成时间格式不正确' })
  expectedAt?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: '姓名必须是字符串' })
  @MinLength(1, { message: '请填写姓名' })
  @MaxLength(30, { message: '姓名不能超过 30 个字符' })
  reporterName!: string;
}
