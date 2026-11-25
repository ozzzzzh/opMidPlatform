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
import { Audit } from '../common/decorators/audit.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateSubsystemDto, QuerySubsystemDto, UpdateSubsystemDto } from './dto/subsystem.dto';
import { SubsystemsService } from './subsystems.service';

@Controller('subsystems')
@Roles(Role.ADMIN, Role.OPS)
export class SubsystemsController {
  constructor(private readonly subsystemsService: SubsystemsService) {}

  @Get()
  list(@Query() query: QuerySubsystemDto) {
    return this.subsystemsService.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subsystemsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Audit('SUBSYSTEM_CREATE', { targetType: 'SUBSYSTEM' })
  create(@Body() dto: CreateSubsystemDto) {
    return this.subsystemsService.create(dto);
  }

  @Patch(':id')
  @Audit('SUBSYSTEM_UPDATE', { targetType: 'SUBSYSTEM' })
  update(@Param('id') id: string, @Body() dto: UpdateSubsystemDto) {
    return this.subsystemsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @Audit('SUBSYSTEM_DELETE', { targetType: 'SUBSYSTEM' })
  remove(@Param('id') id: string) {
    return this.subsystemsService.remove(id);
  }
}
