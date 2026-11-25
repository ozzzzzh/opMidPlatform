import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

function trim({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateContactDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  role?: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  systemName!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  systemShortName?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  systemUrl?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  unit?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  businessDept?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  landline?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  mobile?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpdateContactDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  role?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  systemName?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  systemShortName?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  systemUrl?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  unit?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  businessDept?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  landline?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  mobile?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class QueryContactDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  system?: string;
}

export class LinkContactDto {
  @IsString()
  contactId!: string;
}
