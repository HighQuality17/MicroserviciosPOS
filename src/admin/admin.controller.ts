import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
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

  @Get('low-stock')
  lowStock() {
    return this.adminService.getLowStock();
  }

  @Get('recent-activity')
  recentActivity() {
    return this.adminService.getRecentActivity();
  }
}
