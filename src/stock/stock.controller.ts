import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  AuthenticatedUser,
  CurrentUser,
} from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { AdjustStockDto } from "./dto/adjust-stock.dto";
import { CreateStockAdjustmentDto } from "./dto/create-stock-adjustment.dto";
import { GetStockAdjustmentsQueryDto } from "./dto/get-stock-adjustments-query.dto";
import { GetStockQueryDto } from "./dto/get-stock-query.dto";
import { StockService } from "./stock.service";

@Controller("stock")
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post("adjustments")
  @Roles(UserRole.ADMIN)
  createAdjustment(
    @Body() dto: CreateStockAdjustmentDto,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.stockService.createAdjustment(dto, this.requireUserId(user));
  }

  @Get("adjustments")
  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  getAdjustments(@Query() query: GetStockAdjustmentsQueryDto) {
    return this.stockService.getAdjustments(query);
  }

  @Get("adjustments/:id")
  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  getAdjustmentById(@Param("id", ParseIntPipe) id: number) {
    return this.stockService.getAdjustmentById(id);
  }

  @Post("adjust")
  @Roles(UserRole.ADMIN)
  adjust(@Body() dto: AdjustStockDto) {
    return this.stockService.adjust(dto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.AUDITOR)
  getByLocation(@Query() query: GetStockQueryDto) {
    return this.stockService.getByLocation(query);
  }

  private requireUserId(user?: AuthenticatedUser) {
    if (!user) {
      throw new UnauthorizedException("Authenticated user not found");
    }

    return user.sub;
  }
}
