import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

export const KNOWLEDGE_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export const KNOWLEDGE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export const knowledgeImageOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: KNOWLEDGE_IMAGE_MAX_BYTES,
    files: 10,
  },
  fileFilter: (
    _request: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!KNOWLEDGE_IMAGE_MIME.has(file.mimetype)) {
      callback(new BadRequestException('仅支持 PNG、JPEG、WebP、GIF 图片'), false);
      return;
    }
    callback(null, true);
  },
};

export const KNOWLEDGE_DOCUMENT_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/markdown',
  'text/plain',
]);

export const KNOWLEDGE_DOCUMENT_MAX_BYTES = 50 * 1024 * 1024;

export const knowledgeDocumentOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: KNOWLEDGE_DOCUMENT_MAX_BYTES,
    files: 1,
  },
  fileFilter: (
    _request: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!KNOWLEDGE_DOCUMENT_MIME.has(file.mimetype)) {
      callback(new BadRequestException('仅支持 PDF、Word、Excel、Markdown、TXT 文件'), false);
      return;
    }
    callback(null, true);
  },
};
