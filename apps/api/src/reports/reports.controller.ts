import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get('summary')
  summary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.summary(from, to);
  }

  @Get('sales-chart')
  chart(@Query('days') days?: number) {
    return this.service.salesChart(Number(days) || 14);
  }

  @Get('top-products')
  top(@Query('limit') limit?: number) {
    return this.service.topProducts(Number(limit) || 8);
  }

  @Get('low-stock')
  lowStock(@Query('threshold') threshold?: number) {
    return this.service.lowStock(Number(threshold) || 3);
  }
}
