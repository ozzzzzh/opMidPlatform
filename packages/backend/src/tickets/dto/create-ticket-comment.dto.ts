import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTicketCommentDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: '评论内容必须是字符串' })
  @MinLength(1, { message: '评论内容不能为空' })
  @MaxLength(2000, { message: '评论内容不能超过 2000 个字符' })
  content!: string;
}
