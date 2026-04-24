import { Module } from '@nestjs/common';
import { CatalogImageStorageService } from '../common/media/catalog-image-storage.service';
import { CombosController } from './combos.controller';
import { CombosService } from './combos.service';

@Module({
  controllers: [CombosController],
  providers: [CombosService, CatalogImageStorageService],
  exports: [CombosService, CatalogImageStorageService],
})
export class CombosModule {}
