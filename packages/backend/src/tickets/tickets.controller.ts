import { createReadStream } from 'node:fs';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilesInterceptor } from '@nestjs/platform-express';
import * as QRCode from 'qrcode';
import { Audit, SkipAudit } from '../common/decorators/audit.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { SafeUser } from '../common/types/authenticated-user.interface';
import { CreateStaffTicketDto } from './dto/create-staff-ticket.dto';
import { CreateTicketCommentDto } from './dto/create-ticket-comment.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { LookupTicketDto } from './dto/lookup-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { ResolveTicketDto } from './dto/resolve-ticket.dto';
import { ticketUploadOptions } from './ticket-upload';
import { TicketsService } from './tickets.service';

function contentDisposition(filename: string): string {
  const encoded = encodeURIComponent(filename).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `inline; filename*=UTF-8''${encoded}`;
}

@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Audit('TICKET_CREATE', { targetType: 'TICKET' })
  @UseInterceptors(FilesInterceptor('files', 5, ticketUploadOptions))
  create(@Body() dto: CreateTicketDto, @UploadedFiles() files: Express.Multer.File[] = []) {
    return this.ticketsService.create(dto, files);
  }

  @Public()
  @Get('qrcode')
  async qrcode() {
    const baseUrl = (this.config.get<string>('PUBLIC_BASE_URL') ?? 'http://localhost:8080').replace(
      /\/+$/,
      '',
    );
    const url = `${baseUrl}/report?src=scan`;
    const dataUrl = await QRCode.toDataURL(url, {
      width: 560,
      margin: 1,
      color: { dark: '#111827', light: '#ffffff' },
    });

    return { url, dataUrl };
  }

  @Public()
  @Get('track/:token')
  track(@Param('token') token: string) {
    return this.ticketsService.track(token);
  }

  @Public()
  @Post('lookup')
  @HttpCode(HttpStatus.OK)
  @SkipAudit()
  lookup(@Body() dto: LookupTicketDto) {
    return this.ticketsService.lookup(dto.ticketNo, dto.accessCode);
  }

  @Public()
  @Get('attachments/:attachmentId/file')
  async attachment(@Param('attachmentId') attachmentId: string) {
    const { attachment, filePath } = await this.ticketsService.getAttachmentFile(attachmentId);

    return new StreamableFile(createReadStream(filePath), {
      type: attachment.mimeType ?? 'application/octet-stream',
      disposition: contentDisposition(attachment.filename),
    });
  }

  @Post('staff')
  @HttpCode(HttpStatus.CREATED)
  @Audit('TICKET_CREATE', { targetType: 'TICKET' })
  @UseInterceptors(FilesInterceptor('files', 5, ticketUploadOptions))
  createStaff(
    @Body() dto: CreateStaffTicketDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @CurrentUser() actor: SafeUser,
  ) {
    return this.ticketsService.createStaff(dto, files, actor);
  }

  @Post(':id/attachments')
  @Audit('TICKET_ATTACHMENT', { targetType: 'TICKET' })
  @UseInterceptors(FilesInterceptor('files', 5, ticketUploadOptions))
  addAttachments(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[] = [],
    @CurrentUser() actor: SafeUser,
  ) {
    return this.ticketsService.addAttachments(id, files, actor);
  }

  @Get()
  list(@Query() query: QueryTicketsDto) {
    return this.ticketsService.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Post(':id/claim')
  @HttpCode(HttpStatus.OK)
  @Audit('TICKET_CLAIM', { targetType: 'TICKET' })
  claim(@Param('id') id: string, @CurrentUser() actor: SafeUser) {
    return this.ticketsService.claim(id, actor);
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @Audit('TICKET_RESOLVE', { targetType: 'TICKET' })
  resolve(@Param('id') id: string, @Body() dto: ResolveTicketDto, @CurrentUser() actor: SafeUser) {
    return this.ticketsService.resolve(id, dto, actor);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @Audit('TICKET_CLOSE', { targetType: 'TICKET' })
  close(@Param('id') id: string, @CurrentUser() actor: SafeUser) {
    return this.ticketsService.close(id, actor);
  }

  @Post(':id/comments')
  @Audit('TICKET_COMMENT', { targetType: 'TICKET' })
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateTicketCommentDto,
    @CurrentUser() actor: SafeUser,
  ) {
    return this.ticketsService.addComment(id, dto, actor);
  }
}
