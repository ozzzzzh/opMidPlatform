import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResolveTicketDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: '解决说明必须是字符串' })
  @MinLength(2, { message: '请填写解决说明' })
  @MaxLength(5000, { message: '解决说明不能超过 5000 个字符' })
  resolution!: string;
}
