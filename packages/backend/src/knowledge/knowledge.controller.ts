import { createReadStream } from 'node:fs';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { Audit } from '../common/decorators/audit.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { SafeUser } from '../common/types/authenticated-user.interface';
import {
  CreateKnowledgeCardDto,
  CreateKnowledgeDocumentDto,
  LinkKnowledgeDto,
  QueryKnowledgeDto,
  SuggestKnowledgeDto,
  UpdateKnowledgeCardDto,
  UpdateKnowledgeDocumentDto,
} from './dto/knowledge.dto';
import { knowledgeDocumentOptions, knowledgeImageOptions } from './knowledge-upload';
import { KnowledgeService } from './knowledge.service';

function contentDisposition(filename: string): string {
  const encoded = encodeURIComponent(filename).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `inline; filename*=UTF-8''${encoded}`;
}

@Controller('knowledge')
@Roles(Role.ADMIN, Role.OPS)
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Get()
  list(@Query() query: QueryKnowledgeDto) {
    return this.knowledgeService.list(query);
  }

  @Get('meta')
  meta() {
    return this.knowledgeService.meta();
  }

  @Get('suggest')
  suggest(@Query() query: SuggestKnowledgeDto) {
    return this.knowledgeService.suggest(query.q, query.limit);
  }

  @Get('for-ticket/:ticketId')
  forTicket(@Param('ticketId') ticketId: string) {
    return this.knowledgeService.forTicket(ticketId);
  }

  @Post('for-ticket/:ticketId/link')
  @HttpCode(HttpStatus.OK)
  @Audit('KNOWLEDGE_LINK', { targetType: 'TICKET' })
  linkTicket(
    @Param('ticketId') ticketId: string,
    @Body() dto: LinkKnowledgeDto,
    @CurrentUser() actor: SafeUser,
  ) {
    return this.knowledgeService.linkTicket(ticketId, dto.articleId, actor);
  }

  @Delete('for-ticket/:ticketId/link/:articleId')
  @Audit('KNOWLEDGE_UNLINK', { targetType: 'TICKET' })
  unlinkTicket(
    @Param('ticketId') ticketId: string,
    @Param('articleId') articleId: string,
    @CurrentUser() actor: SafeUser,
  ) {
    return this.knowledgeService.unlinkTicket(ticketId, articleId, actor);
  }

  @Public()
  @Get('attachments/:attachmentId/file')
  async attachmentFile(@Param('attachmentId') attachmentId: string) {
    const { attachment, filePath } = await this.knowledgeService.getAttachmentFile(attachmentId);
    return new StreamableFile(createReadStream(filePath), {
      type: attachment.mimeType ?? 'application/octet-stream',
      disposition: contentDisposition(attachment.filename),
    });
  }

  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  @Audit('KNOWLEDGE_CREATE', { targetType: 'KNOWLEDGE' })
  @UseInterceptors(FileInterceptor('file', knowledgeDocumentOptions))
  createDocument(
    @Body() dto: CreateKnowledgeDocumentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() actor: SafeUser,
  ) {
    return this.knowledgeService.createDocument(dto, file, actor);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Audit('KNOWLEDGE_CREATE', { targetType: 'KNOWLEDGE' })
  createCard(@Body() dto: CreateKnowledgeCardDto, @CurrentUser() actor: SafeUser) {
    return this.knowledgeService.createCard(dto, actor);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.knowledgeService.findOne(id);
  }

  @Patch(':id')
  @Audit('KNOWLEDGE_UPDATE', { targetType: 'KNOWLEDGE' })
  updateCard(
    @Param('id') id: string,
    @Body() dto: UpdateKnowledgeCardDto,
    @CurrentUser() actor: SafeUser,
  ) {
    return this.knowledgeService.updateCard(id, dto, actor);
  }

  @Patch(':id/document')
  @Audit('KNOWLEDGE_UPDATE', { targetType: 'KNOWLEDGE' })
  updateDocument(
    @Param('id') id: string,
    @Body() dto: UpdateKnowledgeDocumentDto,
    @CurrentUser() actor: SafeUser,
  ) {
    return this.knowledgeService.updateDocument(id, dto, actor);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @Audit('KNOWLEDGE_PUBLISH', { targetType: 'KNOWLEDGE' })
  publishCard(@Param('id') id: string, @CurrentUser() actor: SafeUser) {
    return this.knowledgeService.publishCard(id, actor);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @Audit('KNOWLEDGE_ARCHIVE', { targetType: 'KNOWLEDGE' })
  archiveCard(@Param('id') id: string) {
    return this.knowledgeService.archiveCard(id);
  }

  @Post(':id/file')
  @HttpCode(HttpStatus.OK)
  @Audit('KNOWLEDGE_UPDATE', { targetType: 'KNOWLEDGE' })
  @UseInterceptors(FileInterceptor('file', knowledgeDocumentOptions))
  replaceDocumentFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    return this.knowledgeService.replaceDocumentFile(id, file);
  }

  @Get(':id/file')
  async documentFile(@Param('id') id: string) {
    const { article, filePath } = await this.knowledgeService.getDocumentFile(id);
    return new StreamableFile(createReadStream(filePath), {
      type: article.mimeType ?? 'application/octet-stream',
      disposition: contentDisposition(article.filename ?? 'document'),
    });
  }

  @Post(':id/attachments')
  @Audit('KNOWLEDGE_ATTACHMENT', { targetType: 'KNOWLEDGE' })
  @UseInterceptors(FilesInterceptor('files', 10, knowledgeImageOptions))
  addAttachments(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @CurrentUser() actor: SafeUser,
  ) {
    return this.knowledgeService.addAttachments(id, files, actor);
  }

  @Delete('attachments/:attachmentId')
  @Audit('KNOWLEDGE_ATTACHMENT_DELETE', { targetType: 'KNOWLEDGE' })
  removeAttachment(@Param('attachmentId') attachmentId: string) {
    return this.knowledgeService.removeAttachment(attachmentId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @Audit('KNOWLEDGE_DELETE', { targetType: 'KNOWLEDGE' })
  remove(@Param('id') id: string) {
    return this.knowledgeService.remove(id);
  }
}
