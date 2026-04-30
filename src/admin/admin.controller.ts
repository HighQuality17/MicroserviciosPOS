import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GetAdminActivityQueryDto } from './dto/get-admin-activity-query.dto';
import { GetAdminCashReportQueryDto } from './dto/get-admin-cash-report-query.dto';
import { GetAdminSalesReportQueryDto } from './dto/get-admin-sales-report-query.dto';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.AUDITOR)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('summary')
  summary() {
    return this.adminService.getSummary();
  }

  @Get('sales-by-payment')
  salesByPayment() {
    return this.adminService.getSalesByPayment();
  }

  @Get('top-items')
  topItems() {
    return this.adminService.getTopItems();
  }

  @Get('reports/sales')
  salesReport(@Query() query: GetAdminSalesReportQueryDto) {
    return this.adminService.getSalesReport(query);
  }

  @Get('reports/cash')
  cashReport(@Query() query: GetAdminCashReportQueryDto) {
    return this.adminService.getCashReport(query);
  }

  @Get('low-stock')
  lowStock() {
    return this.adminService.getLowStock();
  }

  @Get('activity')
  activity(@Query() query: GetAdminActivityQueryDto) {
    return this.adminService.getActivity(query);
  }

  @Get('activity/:id')
  activityDetail(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getActivityDetail(id);
  }

  @Get('recent-activity')
  recentActivity() {
    return this.adminService.getRecentActivity();
  }
}
