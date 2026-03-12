import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';

@Injectable()
export class IngredientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const ingredients = await this.prisma.ingredient.findMany({
      orderBy: { name: 'asc' },
    });

    return ingredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      dimension: ingredient.dimension,
      default_unit_code: ingredient.defaultUnitCode,
    }));
  }

  async create(dto: CreateIngredientDto) {
    const unitType = await this.prisma.unitType.findUnique({
      where: { code: dto.default_unit_code },
    });
    if (!unitType) {
      throw new BadRequestException('default_unit_code does not exist');
    }
    if (unitType.dimension !== dto.dimension) {
      throw new BadRequestException(
        `default_unit_code dimension ${unitType.dimension} does not match ingredient dimension ${dto.dimension}`,
      );
    }

    try {
      return await this.prisma.ingredient.create({
        data: {
          name: dto.name.trim(),
          dimension: dto.dimension,
          defaultUnitCode: dto.default_unit_code,
        },
      });
    } catch {
      throw new ConflictException('Ingredient name already exists');
    }
  }
}
