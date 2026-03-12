import { Controller, Get } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
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
