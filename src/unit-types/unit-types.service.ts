import { Injectable } from '@nestjs/common';
import { Dimension } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UnitTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async seedDefaults() {
    const items = [
      { code: 'g', dimension: Dimension.WEIGHT, factorToBase: 1 },
      { code: 'kg', dimension: Dimension.WEIGHT, factorToBase: 1000 },
      { code: 'ml', dimension: Dimension.VOLUME, factorToBase: 1 },
      { code: 'L', dimension: Dimension.VOLUME, factorToBase: 1000 },
      { code: 'unit', dimension: Dimension.COUNT, factorToBase: 1 },
    ];

    const seeded = [];
    for (const item of items) {
      const unit = await this.prisma.unitType.upsert({
        where: { code: item.code },
        update: {
          dimension: item.dimension,
          factorToBase: item.factorToBase,
        },
        create: item,
      });
      seeded.push(unit);
    }

    return { count: seeded.length, unitTypes: seeded };
  }
}
