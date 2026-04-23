import { Module } from "@nestjs/common";
import { BusinessActivityModule } from "../business-activity/business-activity.module";
import { StockModule } from "../stock/stock.module";
import { SalesController } from "./sales.controller";
import { SalesService } from "./sales.service";

@Module({
  imports: [StockModule, BusinessActivityModule],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
