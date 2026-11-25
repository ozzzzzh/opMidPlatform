import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateUserDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(3, 32, { message: '用户名长度应为 3-32 个字符' })
  @Matches(/^[a-zA-Z0-9._-]+$/, { message: '用户名只能包含字母、数字、点、下划线和短横线' })
  username!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(1, 64, { message: '显示名称长度应为 1-64 个字符' })
  displayName!: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  })
  @IsEmail({}, { message: '邮箱格式不合法' })
  @MaxLength(128)
  email?: string;

  @IsString()
  @MinLength(8, { message: '密码至少 8 位' })
  @MaxLength(72, { message: '密码最多 72 位' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: '密码必须同时包含字母和数字' })
  password!: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsEnum(Role, { message: 'role 取值不合法' })
  role?: Role;

  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean({ message: 'active 必须是布尔值' })
  active?: boolean;
}
