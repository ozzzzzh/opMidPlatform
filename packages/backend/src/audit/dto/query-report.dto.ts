import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';

export class QueryReportDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([7, 30, 90], { message: '统计范围仅支持 7、30 或 90 天' })
  days: number = 30;

  @IsOptional()
  @IsIn(['zh', 'en'])
  lang: 'zh' | 'en' = 'zh';
}
