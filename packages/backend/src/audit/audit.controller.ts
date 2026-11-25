import { Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';
import { QueryReportDto } from './dto/query-report.dto';

@Controller('audit')
@Roles(Role.ADMIN, Role.OPS)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  list(@Query() query: QueryAuditDto) {
    return this.auditService.list(query);
  }

  @Get('report')
  report(@Query() query: QueryReportDto) {
    return this.auditService.report(query.days);
  }

  @Get('report/export')
  async exportReport(
    @Query() query: QueryReportDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const { filename, csv } = await this.auditService.exportCsv(query.days, query.lang);
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');

    return new StreamableFile(Buffer.from(csv, 'utf8'));
  }
}
