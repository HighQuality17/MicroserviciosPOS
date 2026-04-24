import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductImageStorageService } from './product-image-storage.service';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, ProductImageStorageService],
  exports: [ProductsService, ProductImageStorageService],
})
export class ProductsModule {}
