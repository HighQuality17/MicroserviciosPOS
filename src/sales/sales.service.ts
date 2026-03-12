import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Combo,
  DiscountType,
  IngredientMovementType,
  PaymentMethod,
  Prisma,
  ProductVariant,
  SaleItemType,
  SaleStatus,
} from '@prisma/client';
import { round } from '../common/utils/number.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { PaySaleDto } from './dto/pay-sale.dto';

interface ExpandedVariantNeed {
  variantId: number;
  qty: number;
}

interface IngredientNeed {
  ingredientId: number;
  ingredientName: string;
  qtyBase: number;
}

export interface SaleReceiptItem {
  id: number;
  item_type: SaleItemType;
  ref_id: number;
  description: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

export interface SaleRecentItem {
  sale_id: number;
  created_at: Date;
  total: number;
  status: SaleStatus;
  payment_method: PaymentMethod | null;
  amount_received: number | null;
  change_given: number | null;
  location: {
    id: number;
    name: string;
  };
  cashier: {
    id: number;
    name: string;
  };
}

export interface RecentSalesResponse {
  items: SaleRecentItem[];
}

type SaleItemRecord = {
  id: number;
  itemType: SaleItemType;
  refId: number;
  qty: Prisma.Decimal;
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
};

type SaleWithReceiptRelations = Prisma.SaleGetPayload<{
  include: {
    items: true;
    payments: true;
    location: true;
    cashier: true;
  };
}>;

type SaleWithSummaryRelations = Prisma.SaleGetPayload<{
  include: {
    payments: {
      orderBy: {
        id: 'desc';
      };
      take: 1;
    };
    location: true;
    cashier: true;
  };
}>;

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSaleDto) {
    const [location, cashier, cashSession] = await Promise.all([
      this.prisma.location.findUnique({ where: { id: dto.location_id } }),
      this.prisma.user.findUnique({ where: { id: dto.cashier_id } }),
      this.prisma.cashSession.findUnique({ where: { id: dto.cash_session_id } }),
    ]);

    if (!location) throw new NotFoundException('Location not found');
    if (!cashier) throw new NotFoundException('Cashier user not found');
    if (!cashSession) throw new NotFoundException('Cash session not found');
    if (cashSession.closedAt) {
      throw new BadRequestException('Cash session is closed');
    }
    if (cashSession.locationId !== dto.location_id) {
      throw new BadRequestException(
        'cash_session_id does not belong to location_id',
      );
    }

    const pricedItems = await this.priceSaleItems(dto.items);

    let subtotal = 0;
    const itemsData: Prisma.SaleItemCreateWithoutSaleInput[] = pricedItems.map(
      (item) => {
        subtotal = round(subtotal + item.lineTotal, 2);

        return {
          itemType: item.itemType,
          refId: item.refId,
          qty: item.qty,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
        };
      },
    );

    const discountType = dto.discount_type ?? DiscountType.NONE;
    const discountValue = dto.discount_value ?? 0;
    const discountAmount = this.computeDiscount(
      subtotal,
      discountType,
      discountValue,
    );
    const total = round(Math.max(subtotal - discountAmount, 0), 2);

    return this.prisma.sale.create({
      data: {
        locationId: dto.location_id,
        cashierId: dto.cashier_id,
        cashSessionId: dto.cash_session_id,
        subtotal,
        discountType,
        discountValue,
        discountAmount,
        total,
        status: SaleStatus.PENDING,
        items: {
          create: itemsData,
        },
      },
      include: {
        items: true,
      },
    });
  }

  async pay(id: number, dto: PaySaleDto) {
    const [user, sale] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: dto.user_id } }),
      this.prisma.sale.findUnique({
        where: { id },
        include: {
          items: true,
          cashSession: true,
        },
      }),
    ]);

    if (!user) throw new NotFoundException('User not found');
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status !== SaleStatus.PENDING) {
      throw new BadRequestException('Sale is not pending');
    }
    if (sale.cashSession.closedAt) {
      throw new BadRequestException('Cannot pay sale in a closed cash session');
    }

    const total = Number(sale.total);
    const { amountApplied, changeGiven } = this.computePaymentFields(
      total,
      dto.method,
      dto.amount_received,
    );

    const ingredientNeeds = await this.computeIngredientNeedsFromSaleItems(
      sale.items,
    );
    await this.assertSufficientStock(sale.locationId, ingredientNeeds);

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          saleId: sale.id,
          method: dto.method,
          amountReceived: dto.amount_received,
          amountApplied,
          changeGiven,
        },
      });

      for (const need of ingredientNeeds) {
        const current = await tx.ingredientStock.findUnique({
          where: {
            ingredientId_locationId: {
              ingredientId: need.ingredientId,
              locationId: sale.locationId,
            },
          },
        });
        const nextQty = round(Number(current?.qtyOnHandBase ?? 0) - need.qtyBase, 3);

        await tx.ingredientStock.upsert({
          where: {
            ingredientId_locationId: {
              ingredientId: need.ingredientId,
              locationId: sale.locationId,
            },
          },
          update: { qtyOnHandBase: nextQty },
          create: {
            ingredientId: need.ingredientId,
            locationId: sale.locationId,
            qtyOnHandBase: nextQty,
          },
        });

        await tx.ingredientMovement.create({
          data: {
            ingredientId: need.ingredientId,
            locationId: sale.locationId,
            type: IngredientMovementType.OUT,
            qtyBase: need.qtyBase,
            reason: 'SALE_PAYMENT',
            refSaleId: sale.id,
            userId: dto.user_id,
          },
        });
      }

      await tx.sale.update({
        where: { id: sale.id },
        data: { status: SaleStatus.PAID },
      });

      await tx.auditLog.create({
        data: {
          userId: dto.user_id,
          action: 'SALE_PAID',
          entity: 'sale',
          entityId: sale.id,
          metadataJson: JSON.stringify({
            sale_id: sale.id,
            payment_method: dto.method,
            total,
            amount_received: dto.amount_received,
            amount_applied: amountApplied,
            change_given: changeGiven,
          }),
        },
      });

      return {
        sale_id: sale.id,
        status: SaleStatus.PAID,
        payment,
      };
    });
  }

  async receipt(id: number) {
    const sale = await this.findSaleForReceipt(id);
    if (!sale) throw new NotFoundException('Sale not found');

    return this.buildReceiptResponse(sale);
  }

  async recent(limit = 5): Promise<RecentSalesResponse> {
    const sales = await this.prisma.sale.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        payments: {
          orderBy: { id: 'desc' },
          take: 1,
        },
        location: true,
        cashier: true,
      },
    });

    return {
      items: sales.map((sale) => this.buildRecentSaleSummary(sale)),
    };
  }

  async latest() {
    const sale = await this.prisma.sale.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        payments: true,
        location: true,
        cashier: true,
      },
    });

    if (!sale) {
      return null;
    }

    const receipt = await this.buildReceiptResponse(sale);

    return {
      ...receipt,
      status: sale.status,
    };
  }

  private async priceSaleItems(items: CreateSaleDto['items']) {
    const variantIds = items
      .filter((item) => item.item_type === SaleItemType.VARIANT)
      .map((item) => item.ref_id);
    const comboIds = items
      .filter((item) => item.item_type === SaleItemType.COMBO)
      .map((item) => item.ref_id);

    const [variants, combos] = await Promise.all([
      this.prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
      }),
      this.prisma.combo.findMany({
        where: { id: { in: comboIds } },
      }),
    ]);

    const variantById = new Map(variants.map((variant) => [variant.id, variant]));
    const comboById = new Map(combos.map((combo) => [combo.id, combo]));

    return items.map((item) => {
      const catalogItem = this.resolveCatalogItem(
        item.item_type,
        item.ref_id,
        variantById,
        comboById,
      );

      const unitPrice = Number(catalogItem.salePrice);
      const lineTotal = round(unitPrice * item.qty, 2);

      return {
        itemType: item.item_type,
        refId: item.ref_id,
        qty: item.qty,
        unitPrice,
        lineTotal,
      };
    });
  }

  private resolveCatalogItem(
    itemType: SaleItemType,
    refId: number,
    variantById: Map<number, ProductVariant>,
    comboById: Map<number, Combo>,
  ) {
    if (itemType === SaleItemType.VARIANT) {
      const variant = variantById.get(refId);
      if (!variant || !variant.active) {
        throw new BadRequestException(`Variant ${refId} is invalid/inactive`);
      }
      return variant;
    }

    if (itemType === SaleItemType.COMBO) {
      const combo = comboById.get(refId);
      if (!combo || !combo.active) {
        throw new BadRequestException(`Combo ${refId} is invalid/inactive`);
      }
      return combo;
    }

    throw new BadRequestException(`Unsupported item_type ${itemType}`);
  }

  private async buildReceiptItems(items: SaleItemRecord[]): Promise<SaleReceiptItem[]> {
    const variantIds = items
      .filter((item) => item.itemType === SaleItemType.VARIANT)
      .map((item) => item.refId);
    const comboIds = items
      .filter((item) => item.itemType === SaleItemType.COMBO)
      .map((item) => item.refId);

    const [variants, combos] = await Promise.all([
      this.prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: { product: true },
      }),
      this.prisma.combo.findMany({
        where: { id: { in: comboIds } },
      }),
    ]);

    const variantById = new Map(variants.map((variant) => [variant.id, variant]));
    const comboById = new Map(combos.map((combo) => [combo.id, combo]));

    return items.map((item) => ({
      id: item.id,
      item_type: item.itemType,
      ref_id: item.refId,
      description:
        item.itemType === SaleItemType.VARIANT
          ? this.getVariantDescription(item.refId, variantById)
          : comboById.get(item.refId)?.name ?? `Combo ${item.refId}`,
      qty: Number(item.qty),
      unit_price: Number(item.unitPrice),
      line_total: Number(item.lineTotal),
    }));
  }

  private getVariantDescription(
    refId: number,
    variantById: Map<number, ProductVariant & { product: { name: string } }>,
  ) {
    const variant = variantById.get(refId);
    return variant ? `${variant.product.name} ${variant.size}` : `Variant ${refId}`;
  }

  private async findSaleForReceipt(id: number) {
    return this.prisma.sale.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
        location: true,
        cashier: true,
      },
    });
  }

  private async buildReceiptResponse(sale: SaleWithReceiptRelations) {
    const detailedItems = await this.buildReceiptItems(sale.items);
    const payment = sale.payments[0] ?? null;

    return {
      sale_id: sale.id,
      created_at: sale.createdAt,
      location: {
        id: sale.location.id,
        name: sale.location.name,
      },
      cashier: {
        id: sale.cashier.id,
        name: sale.cashier.name,
      },
      items: detailedItems,
      subtotal: Number(sale.subtotal),
      discount_type: sale.discountType,
      discount_value: Number(sale.discountValue),
      discount_amount: Number(sale.discountAmount),
      total: Number(sale.total),
      payment_method: payment?.method ?? null,
      amount_received: payment ? Number(payment.amountReceived) : null,
      change_given: payment ? Number(payment.changeGiven) : null,
    };
  }

  private buildRecentSaleSummary(sale: SaleWithSummaryRelations): SaleRecentItem {
    const payment = sale.payments[0] ?? null;

    return {
      sale_id: sale.id,
      created_at: sale.createdAt,
      total: Number(sale.total),
      status: sale.status,
      payment_method: payment?.method ?? null,
      amount_received: payment ? Number(payment.amountReceived) : null,
      change_given: payment ? Number(payment.changeGiven) : null,
      location: {
        id: sale.location.id,
        name: sale.location.name,
      },
      cashier: {
        id: sale.cashier.id,
        name: sale.cashier.name,
      },
    };
  }

  private computeDiscount(
    subtotal: number,
    discountType: DiscountType,
    discountValue: number,
  ): number {
    if (discountValue < 0) {
      throw new BadRequestException('discount_value must be >= 0');
    }

    if (discountType === DiscountType.NONE) return 0;

    if (discountType === DiscountType.PERCENT) {
      if (discountValue > 100) {
        throw new BadRequestException('PERCENT discount cannot exceed 100');
      }
      return round(subtotal * (discountValue / 100), 2);
    }

    if (discountType === DiscountType.FIXED) {
      return round(Math.min(discountValue, subtotal), 2);
    }

    throw new BadRequestException('Unsupported discount_type');
  }

  private computePaymentFields(
    total: number,
    method: PaymentMethod,
    amountReceived: number,
  ) {
    if (method === PaymentMethod.CASH) {
      if (amountReceived < total) {
        throw new BadRequestException('CASH amount_received must be >= total');
      }
      return {
        amountApplied: total,
        changeGiven: round(amountReceived - total, 2),
      };
    }

    if (method === PaymentMethod.TRANSFER) {
      if (amountReceived < total) {
        throw new BadRequestException(
          'TRANSFER amount_received must be >= total',
        );
      }
      return {
        amountApplied: total,
        changeGiven: 0,
      };
    }

    throw new BadRequestException('Unsupported payment method');
  }

  private async computeIngredientNeedsFromSaleItems(items: SaleItemRecord[]) {
    const expandedVariants = await this.expandSaleItemsToVariants(items);
    const variantIds = expandedVariants.map((item) => item.variantId);

    const recipes = await this.prisma.variantRecipeItem.findMany({
      where: {
        variantId: { in: variantIds },
      },
      include: {
        ingredient: true,
      },
    });

    const recipeByVariant = new Map<number, typeof recipes>();
    for (const recipe of recipes) {
      const group = recipeByVariant.get(recipe.variantId) ?? [];
      group.push(recipe);
      recipeByVariant.set(recipe.variantId, group);
    }

    const totals = new Map<number, IngredientNeed>();
    for (const saleItem of expandedVariants) {
      const recipeItems = recipeByVariant.get(saleItem.variantId);
      if (!recipeItems || recipeItems.length === 0) {
        throw new BadRequestException(
          `Variant ${saleItem.variantId} has no recipe configured`,
        );
      }

      for (const recipeItem of recipeItems) {
        const qtyBase = round(
          Number(recipeItem.qtyBaseRequired) * saleItem.qty,
          3,
        );
        const current = totals.get(recipeItem.ingredientId);

        totals.set(recipeItem.ingredientId, {
          ingredientId: recipeItem.ingredientId,
          ingredientName: recipeItem.ingredient.name,
          qtyBase: round((current?.qtyBase ?? 0) + qtyBase, 3),
        });
      }
    }

    return Array.from(totals.values());
  }

  private async expandSaleItemsToVariants(items: SaleItemRecord[]) {
    const variantNeeds: ExpandedVariantNeed[] = [];
    const comboItems = items.filter((item) => item.itemType === SaleItemType.COMBO);
    const variantItems = items.filter((item) => item.itemType === SaleItemType.VARIANT);

    for (const item of variantItems) {
      variantNeeds.push({
        variantId: item.refId,
        qty: Number(item.qty),
      });
    }

    if (comboItems.length === 0) {
      return variantNeeds;
    }

    const comboIds = comboItems.map((item) => item.refId);
    const combos = await this.prisma.combo.findMany({
      where: { id: { in: comboIds } },
      include: {
        items: true,
      },
    });
    const comboById = new Map(combos.map((combo) => [combo.id, combo]));

    for (const comboSaleItem of comboItems) {
      const combo = comboById.get(comboSaleItem.refId);
      if (!combo || !combo.active) {
        throw new BadRequestException(`Combo ${comboSaleItem.refId} is invalid/inactive`);
      }
      if (combo.items.length === 0) {
        throw new BadRequestException(
          `Combo ${comboSaleItem.refId} has no items configured`,
        );
      }

      for (const comboItem of combo.items) {
        variantNeeds.push({
          variantId: comboItem.variantId,
          qty: round(Number(comboItem.qty) * Number(comboSaleItem.qty), 3),
        });
      }
    }

    return this.mergeVariantNeeds(variantNeeds);
  }

  private mergeVariantNeeds(items: ExpandedVariantNeed[]) {
    const totals = new Map<number, number>();

    for (const item of items) {
      totals.set(
        item.variantId,
        round((totals.get(item.variantId) ?? 0) + item.qty, 3),
      );
    }

    return Array.from(totals.entries()).map(([variantId, qty]) => ({
      variantId,
      qty,
    }));
  }

  private async assertSufficientStock(
    locationId: number,
    ingredientNeeds: IngredientNeed[],
  ) {
    for (const need of ingredientNeeds) {
      const stock = await this.prisma.ingredientStock.findUnique({
        where: {
          ingredientId_locationId: {
            ingredientId: need.ingredientId,
            locationId,
          },
        },
      });

      const currentQty = Number(stock?.qtyOnHandBase ?? 0);
      if (currentQty < need.qtyBase) {
        const shortage = round(need.qtyBase - currentQty, 3);
        throw new BadRequestException(
          `Insufficient stock for ingredient ${need.ingredientName}. Missing ${shortage} base units`,
        );
      }
    }
  }
}
