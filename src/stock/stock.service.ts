import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  IngredientMovementReasonCode,
  IngredientMovementReferenceType,
  IngredientMovementType,
  Prisma,
} from "@prisma/client";
import { round } from "../common/utils/number.util";
import { PrismaService } from "../prisma/prisma.service";
import { AdjustStockDto } from "./dto/adjust-stock.dto";
import { CreateStockAdjustmentDto } from "./dto/create-stock-adjustment.dto";
import { GetStockAdjustmentsQueryDto } from "./dto/get-stock-adjustments-query.dto";
import { GetStockQueryDto } from "./dto/get-stock-query.dto";

interface MovementPersistenceInput {
  ingredientId: number;
  locationId: number;
  adjustedByUserId: number;
  movementType: IngredientMovementType;
  qtyBase?: number | null;
  countedStock?: number | null;
  reasonCode?: IngredientMovementReasonCode | null;
  notes?: string | null;
  supportDocument?: string | null;
  unitCostAtTime?: number | null;
  batchNumber?: string | null;
  referenceType?: IngredientMovementReferenceType | null;
  referenceId?: number | null;
}

interface SaleExitInput {
  ingredientId: number;
  locationId: number;
  adjustedByUserId: number;
  qtyBase: number;
  referenceId: number;
}

const movementDetailInclude = {
  ingredient: true,
  location: true,
  adjustedByUser: {
    select: {
      id: true,
      name: true,
      role: true,
    },
  },
  sale: {
    select: {
      id: true,
      status: true,
      total: true,
      createdAt: true,
    },
  },
} satisfies Prisma.IngredientMovementInclude;

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async adjust(dto: AdjustStockDto) {
    const context = await this.ensureMovementContext(
      dto.location_id,
      dto.ingredient_id,
      dto.user_id,
    );
    const qtyBase = await this.resolveQtyBase(
      context.ingredient.dimension,
      dto.unit_code,
      dto.qty,
    );

    if (qtyBase === 0) {
      throw new BadRequestException("qty must be different from 0");
    }

    return this.prisma.$transaction(async (tx) => {
      const result = await this.persistMovement(tx, {
        ingredientId: dto.ingredient_id,
        locationId: dto.location_id,
        adjustedByUserId: dto.user_id,
        movementType: IngredientMovementType.ADJUSTMENT,
        qtyBase,
        reasonCode:
          qtyBase > 0
            ? IngredientMovementReasonCode.POSITIVE_ADJUSTMENT
            : IngredientMovementReasonCode.NEGATIVE_ADJUSTMENT,
        notes: this.normalizeOptionalText(dto.reason),
        referenceType: IngredientMovementReferenceType.MANUAL,
      });

      return {
        stock: result.stock,
        movement: result.movement,
      };
    });
  }

  async createAdjustment(
    dto: CreateStockAdjustmentDto,
    adjustedByUserId: number,
  ) {
    await this.ensureMovementContext(
      dto.location_id,
      dto.ingredient_id,
      adjustedByUserId,
    );

    const notes = this.normalizeOptionalText(dto.notes);
    const supportDocument = this.normalizeOptionalText(dto.support_document);
    const batchNumber = this.normalizeOptionalText(dto.batch_number);
    let qtyBase: number | null = null;
    let countedStock: number | null = null;

    if (dto.movement_type === IngredientMovementType.ADJUSTMENT) {
      if (dto.qty !== undefined) {
        throw new BadRequestException(
          "qty is not allowed for ADJUSTMENT movements",
        );
      }
      if (dto.counted_stock === undefined || dto.counted_stock === null) {
        throw new BadRequestException(
          "counted_stock is required for ADJUSTMENT",
        );
      }
      if (!notes) {
        throw new BadRequestException("notes is required for ADJUSTMENT");
      }

      countedStock = await this.resolveQtyBaseFromCount(
        dto.ingredient_id,
        dto.unit_code,
        dto.counted_stock,
        true,
      );
    } else {
      if (dto.counted_stock !== undefined) {
        throw new BadRequestException(
          "counted_stock is only allowed for ADJUSTMENT movements",
        );
      }
      if (dto.qty === undefined || dto.qty === null) {
        throw new BadRequestException("qty is required for ENTRY and EXIT");
      }

      qtyBase = await this.resolveQtyBaseFromCount(
        dto.ingredient_id,
        dto.unit_code,
        dto.qty,
      );
    }

    if (dto.movement_type === IngredientMovementType.EXIT && !notes) {
      throw new BadRequestException("notes is required for EXIT");
    }

    if (
      dto.movement_type !== IngredientMovementType.ENTRY &&
      dto.unit_cost_at_time !== undefined
    ) {
      throw new BadRequestException(
        "unit_cost_at_time is only allowed for ENTRY movements",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const result = await this.persistMovement(tx, {
        ingredientId: dto.ingredient_id,
        locationId: dto.location_id,
        adjustedByUserId,
        movementType: dto.movement_type,
        qtyBase,
        countedStock,
        reasonCode: dto.reason_code,
        notes,
        supportDocument,
        batchNumber,
        unitCostAtTime:
          dto.unit_cost_at_time === undefined
            ? null
            : round(dto.unit_cost_at_time, 2),
        referenceType: IngredientMovementReferenceType.MANUAL,
      });

      return {
        stock: result.stock,
        movement: result.movement,
      };
    });
  }

  async createSaleExit(tx: Prisma.TransactionClient, input: SaleExitInput) {
    return this.persistMovement(tx, {
      ingredientId: input.ingredientId,
      locationId: input.locationId,
      adjustedByUserId: input.adjustedByUserId,
      movementType: IngredientMovementType.EXIT,
      qtyBase: input.qtyBase,
      notes: "Salida automatica por venta pagada",
      referenceType: IngredientMovementReferenceType.SALE,
      referenceId: input.referenceId,
    });
  }

  async getAdjustments(query: GetStockAdjustmentsQueryDto) {
    if (query.location_id) {
      const location = await this.prisma.location.findUnique({
        where: { id: query.location_id },
      });
      if (!location) throw new NotFoundException("Location not found");
    }

    if (query.ingredient_id) {
      const ingredient = await this.prisma.ingredient.findUnique({
        where: { id: query.ingredient_id },
      });
      if (!ingredient) throw new NotFoundException("Ingredient not found");
    }

    const where: Prisma.IngredientMovementWhereInput = {
      ...(query.location_id ? { locationId: query.location_id } : {}),
      ...(query.ingredient_id ? { ingredientId: query.ingredient_id } : {}),
      ...(query.movement_type ? { movementType: query.movement_type } : {}),
      ...(query.reason_code ? { reasonCode: query.reason_code } : {}),
      ...(query.include_sale_movements
        ? {}
        : {
            OR: [
              { referenceType: IngredientMovementReferenceType.MANUAL },
              { referenceType: null },
            ],
          }),
    };

    const [items, total] = await Promise.all([
      this.prisma.ingredientMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: query.limit ?? 20,
        include: movementDetailInclude,
      }),
      this.prisma.ingredientMovement.count({ where }),
    ]);

    return {
      items,
      total,
      limit: query.limit ?? 20,
    };
  }

  async getAdjustmentById(id: number) {
    const movement = await this.prisma.ingredientMovement.findUnique({
      where: { id },
      include: movementDetailInclude,
    });

    if (!movement) {
      throw new NotFoundException("Stock movement not found");
    }

    return movement;
  }

  async getByLocation(query: GetStockQueryDto) {
    const location = await this.prisma.location.findUnique({
      where: { id: query.location_id },
    });
    if (!location) throw new NotFoundException("Location not found");

    const rows = await this.prisma.ingredientStock.findMany({
      where: { locationId: query.location_id },
      include: {
        ingredient: true,
        location: true,
      },
      orderBy: [{ ingredient: { name: "asc" } }],
    });

    return {
      location,
      items: rows,
    };
  }

  private async ensureMovementContext(
    locationId: number,
    ingredientId: number,
    adjustedByUserId: number,
  ) {
    const [location, ingredient, user] = await Promise.all([
      this.prisma.location.findUnique({ where: { id: locationId } }),
      this.prisma.ingredient.findUnique({ where: { id: ingredientId } }),
      this.prisma.user.findUnique({ where: { id: adjustedByUserId } }),
    ]);

    if (!location) throw new NotFoundException("Location not found");
    if (!ingredient) throw new NotFoundException("Ingredient not found");
    if (!user) throw new NotFoundException("User not found");

    return {
      location,
      ingredient,
      user,
    };
  }

  private async resolveQtyBaseFromCount(
    ingredientId: number,
    unitCode: string,
    qty: number,
    allowZero = false,
  ) {
    if ((allowZero && qty < 0) || (!allowZero && qty <= 0)) {
      throw new BadRequestException(
        allowZero
          ? "counted_stock cannot be negative"
          : "qty must be greater than 0",
      );
    }

    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: ingredientId },
    });
    if (!ingredient) throw new NotFoundException("Ingredient not found");

    return this.resolveQtyBase(ingredient.dimension, unitCode, qty);
  }

  private async resolveQtyBase(
    dimension: string,
    unitCode: string,
    qty: number,
  ) {
    const unitType = await this.prisma.unitType.findUnique({
      where: { code: unitCode },
    });

    if (!unitType) {
      throw new BadRequestException("unit_code does not exist");
    }

    if (unitType.dimension !== dimension) {
      throw new BadRequestException(
        "unit_code dimension does not match ingredient",
      );
    }

    return round(qty * Number(unitType.factorToBase), 3);
  }

  private normalizeOptionalText(value?: string | null) {
    const normalized = value?.trim();
    return normalized ? normalized : null;
  }

  private async persistMovement(
    tx: Prisma.TransactionClient,
    input: MovementPersistenceInput,
  ) {
    const current = await tx.ingredientStock.findUnique({
      where: {
        ingredientId_locationId: {
          ingredientId: input.ingredientId,
          locationId: input.locationId,
        },
      },
    });

    const previousStock = round(Number(current?.qtyOnHandBase ?? 0), 3);
    let qtyBase = round(Number(input.qtyBase ?? 0), 3);
    let countedStock =
      input.countedStock === undefined || input.countedStock === null
        ? null
        : round(Number(input.countedStock), 3);
    let newStock = previousStock;

    if (input.movementType === IngredientMovementType.ENTRY) {
      if (qtyBase <= 0) {
        throw new BadRequestException("qty must be greater than 0 for ENTRY");
      }
      newStock = round(previousStock + qtyBase, 3);
    }

    if (input.movementType === IngredientMovementType.EXIT) {
      if (qtyBase <= 0) {
        throw new BadRequestException("qty must be greater than 0 for EXIT");
      }
      newStock = round(previousStock - qtyBase, 3);
    }

    if (input.movementType === IngredientMovementType.ADJUSTMENT) {
      if (countedStock !== null) {
        if (countedStock < 0) {
          throw new BadRequestException("counted_stock cannot be negative");
        }
        newStock = countedStock;
        qtyBase = round(countedStock - previousStock, 3);
      } else {
        if (qtyBase === 0) {
          throw new BadRequestException(
            "qty must be different from 0 for legacy ADJUSTMENT",
          );
        }
        newStock = round(previousStock + qtyBase, 3);
      }
    }

    if (newStock < 0) {
      throw new BadRequestException("The movement would leave stock below 0");
    }

    const stock = await tx.ingredientStock.upsert({
      where: {
        ingredientId_locationId: {
          ingredientId: input.ingredientId,
          locationId: input.locationId,
        },
      },
      update: { qtyOnHandBase: newStock },
      create: {
        ingredientId: input.ingredientId,
        locationId: input.locationId,
        qtyOnHandBase: newStock,
      },
    });

    const movement = await tx.ingredientMovement.create({
      data: {
        ingredientId: input.ingredientId,
        locationId: input.locationId,
        movementType: input.movementType,
        qtyBase,
        notes: input.notes ?? null,
        referenceType: input.referenceType ?? null,
        referenceId: input.referenceId ?? null,
        adjustedByUserId: input.adjustedByUserId,
        reasonCode: input.reasonCode ?? null,
        supportDocument: input.supportDocument ?? null,
        unitCostAtTime:
          input.unitCostAtTime === undefined || input.unitCostAtTime === null
            ? null
            : round(input.unitCostAtTime, 2),
        batchNumber: input.batchNumber ?? null,
        previousStock,
        newStock,
        countedStock,
      },
      include: movementDetailInclude,
    });

    return {
      stock,
      movement,
    };
  }
}
