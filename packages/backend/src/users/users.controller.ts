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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { SafeUser } from '../common/types/authenticated-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@Roles(Role.ADMIN, Role.OPS)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Query() query: QueryUsersDto) {
    return this.usersService.list(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Audit('USER_CREATE', { targetType: 'USER' })
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: SafeUser) {
    return this.usersService.create(dto, actor);
  }

  @Patch(':id')
  @Audit('USER_UPDATE', { targetType: 'USER' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: SafeUser) {
    return this.usersService.update(id, dto, actor);
  }

  @Delete(':id')
  @Audit('USER_DELETE', { targetType: 'USER' })
  deactivate(@Param('id') id: string, @CurrentUser() actor: SafeUser) {
    return this.usersService.deactivate(id, actor);
  }
}
