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
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SafeUser } from '../common/types/authenticated-user.interface';
import { LinkContactDto } from './dto/contact.dto';
import { Audit } from '../common/decorators/audit.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ContactsService } from './contacts.service';
import { CreateContactDto, QueryContactDto, UpdateContactDto } from './dto/contact.dto';

@Controller('contacts')
@Roles(Role.ADMIN, Role.OPS)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  list(@Query() query: QueryContactDto) {
    return this.contactsService.list(query);
  }

  @Get('for-ticket/:ticketId')
  forTicket(@Param('ticketId') ticketId: string) {
    return this.contactsService.forTicket(ticketId);
  }

  @Post('for-ticket/:ticketId/link')
  @HttpCode(HttpStatus.OK)
  @Audit('CONTACT_LINK', { targetType: 'TICKET' })
  linkTicket(
    @Param('ticketId') ticketId: string,
    @Body() dto: LinkContactDto,
    @CurrentUser() actor: SafeUser,
  ) {
    return this.contactsService.linkTicket(ticketId, dto.contactId, actor);
  }

  @Delete('for-ticket/:ticketId/link/:contactId')
  @Audit('CONTACT_UNLINK', { targetType: 'TICKET' })
  unlinkTicket(@Param('ticketId') ticketId: string, @Param('contactId') contactId: string) {
    return this.contactsService.unlinkTicket(ticketId, contactId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contactsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Audit('CONTACT_CREATE', { targetType: 'CONTACT' })
  create(@Body() dto: CreateContactDto) {
    return this.contactsService.create(dto);
  }

  @Patch(':id')
  @Audit('CONTACT_UPDATE', { targetType: 'CONTACT' })
  update(@Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @Audit('CONTACT_DELETE', { targetType: 'CONTACT' })
  remove(@Param('id') id: string) {
    return this.contactsService.remove(id);
  }
}
