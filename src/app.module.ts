import { AppController } from './app.controller';

import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { LocationsModule } from './locations/locations.module';
import { UnitTypesModule } from './unit-types/unit-types.module';
import { IngredientsModule } from './ingredients/ingredients.module';
import { StockModule } from './stock/stock.module';
import { ProductsModule } from './products/products.module';
import { VariantsModule } from './variants/variants.module';
import { RecipesModule } from './recipes/recipes.module';
import { CashModule } from './cash/cash.module';
import { SalesModule } from './sales/sales.module';
import { CombosModule } from './combos/combos.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AuditModule,
    LocationsModule,
    UnitTypesModule,
    IngredientsModule,
    StockModule,
    ProductsModule,
    VariantsModule,
    RecipesModule,
    CombosModule,
    AdminModule,
    CashModule,
    SalesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
