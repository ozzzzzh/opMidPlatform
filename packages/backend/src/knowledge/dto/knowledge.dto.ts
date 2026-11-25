import {
  KnowledgeDocType,
  KnowledgeKind,
  KnowledgeSpace,
  KnowledgeStatus,
  TicketCategory,
} from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

function toStringArray({ value }: { value: unknown }): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // Fall back to comma-separated input.
    }
    return trimmed
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value;
}

function toBoolean({ value }: { value: unknown }): unknown {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
}

export class KnowledgeStepDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body!: string;
}

export class CreateKnowledgeCardDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsEnum(KnowledgeSpace, { message: '知识空间不合法' })
  space!: KnowledgeSpace;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  system?: string;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  symptom?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KnowledgeStepDto)
  steps?: KnowledgeStepDto[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  escalation?: string;

  @IsOptional()
  @IsEnum(KnowledgeStatus)
  status?: KnowledgeStatus;

  @IsOptional()
  @IsString()
  sourceTicketId?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  needsReview?: boolean;

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  legacyPaths?: string[];
}

export class UpdateKnowledgeCardDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsEnum(KnowledgeSpace)
  space?: KnowledgeSpace;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  system?: string;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  symptom?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KnowledgeStepDto)
  steps?: KnowledgeStepDto[];

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  escalation?: string;

  @IsOptional()
  @IsEnum(KnowledgeStatus)
  status?: KnowledgeStatus;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  needsReview?: boolean;

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  legacyPaths?: string[];
}

export class CreateKnowledgeDocumentDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsEnum(KnowledgeSpace, { message: '知识空间不合法' })
  space!: KnowledgeSpace;

  @IsEnum(KnowledgeDocType, { message: '文档类型不合法' })
  docType!: KnowledgeDocType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  system?: string;

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;
}

export class UpdateKnowledgeDocumentDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsEnum(KnowledgeSpace)
  space?: KnowledgeSpace;

  @IsOptional()
  @IsEnum(KnowledgeDocType)
  docType?: KnowledgeDocType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  system?: string;

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsEnum(TicketCategory)
  category?: TicketCategory;
}

export class QueryKnowledgeDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @IsEnum(KnowledgeSpace)
  space?: KnowledgeSpace;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  system?: string;

  @IsOptional()
  @IsEnum(KnowledgeKind)
  kind?: KnowledgeKind;

  @IsOptional()
  @IsEnum(KnowledgeStatus)
  status?: KnowledgeStatus;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  tag?: string;
}

export class SuggestKnowledgeDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  q!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit: number = 5;
}

export class LinkKnowledgeDto {
  @IsString()
  articleId!: string;
}

export class UpdateKnowledgeStatusDto {
  @IsEnum(KnowledgeStatus)
  status!: KnowledgeStatus;
}
