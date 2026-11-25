import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

export const TICKET_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export const TICKET_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export const ticketUploadOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: TICKET_IMAGE_MAX_BYTES,
    files: 5,
  },
  fileFilter: (
    _request: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (!TICKET_IMAGE_MIME.has(file.mimetype)) {
      callback(new BadRequestException('仅支持 PNG、JPEG、WebP、GIF 图片'), false);
      return;
    }
    callback(null, true);
  },
};
