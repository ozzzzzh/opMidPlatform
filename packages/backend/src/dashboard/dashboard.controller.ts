import { Controller, Get } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { SafeUser } from '../common/types/authenticated-user.interface';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@Roles(Role.ADMIN, Role.OPS)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  report(@CurrentUser() actor: SafeUser) {
    return this.dashboardService.report(actor);
  }
}
