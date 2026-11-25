import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: '用户名必须是字符串' })
  @Length(1, 64, { message: '用户名长度应为 1-64 个字符' })
  username!: string;

  @IsString({ message: '密码必须是字符串' })
  @Length(1, 128, { message: '密码长度应为 1-128 个字符' })
  password!: string;
}
