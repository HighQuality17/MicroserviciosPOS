import { Module } from '@nestjs/common';
import { CatalogImageStorageService } from '../common/media/catalog-image-storage.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, CatalogImageStorageService],
  exports: [ProductsService, CatalogImageStorageService],
})
export class ProductsModule {}
