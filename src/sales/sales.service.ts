import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DiscountType,
  IngredientMovementType,
  PaymentMethod,
  Prisma,
  SaleItemType,
  SaleStatus,
} from '@prisma/client';
import { round } from '../common/utils/number.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { PaySaleDto } from './dto/pay-sale.dto';

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

    const variantIds = dto.items.map((item) => item.ref_id);
    const variants = await this.prisma.productVariant.findMany({
      where: {
        id: { in: variantIds },
      },
    });
    const variantById = new Map(variants.map((v) => [v.id, v]));

    const itemsData: Prisma.SaleItemCreateWithoutSaleInput[] = [];
    let subtotal = 0;

    for (const item of dto.items) {
      if (item.item_type !== SaleItemType.VARIANT) {
        throw new BadRequestException('Only VARIANT sale_items are supported');
      }
      const variant = variantById.get(item.ref_id);
      if (!variant || !variant.active) {
        throw new BadRequestException(`Variant ${item.ref_id} is invalid/inactive`);
      }

      const unitPrice = Number(variant.salePrice);
      const lineTotal = round(unitPrice * item.qty, 2);
      subtotal = round(subtotal + lineTotal, 2);

      itemsData.push({
        itemType: SaleItemType.VARIANT,
        refId: item.ref_id,
        qty: item.qty,
        unitPrice,
        lineTotal,
      });
    }

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

    return this.prisma.$transaction(async (tx) => {
      for (const need of ingredientNeeds) {
        const stock = await tx.ingredientStock.findUnique({
          where: {
            ingredientId_locationId: {
              ingredientId: need.ingredientId,
              locationId: sale.locationId,
            },
          },
        });

        const currentQty = Number(stock?.qtyOnHandBase ?? 0);
        if (currentQty < need.qtyBase) {
          const ingredient = await tx.ingredient.findUnique({
            where: { id: need.ingredientId },
          });
          throw new BadRequestException(
            `Insufficient stock for ingredient ${ingredient?.name ?? need.ingredientId}`,
          );
        }
      }

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
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
        location: true,
        cashier: true,
      },
    });
    if (!sale) throw new NotFoundException('Sale not found');

    const variantIds = sale.items
      .filter((item) => item.itemType === SaleItemType.VARIANT)
      .map((item) => item.refId);

    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: true },
    });
    const variantById = new Map(variants.map((v) => [v.id, v]));

    return {
      receipt_id: `R-${sale.id.toString().padStart(8, '0')}`,
      sale_id: sale.id,
      created_at: sale.createdAt,
      status: sale.status,
      location: {
        id: sale.location.id,
        name: sale.location.name,
      },
      cashier: {
        id: sale.cashier.id,
        name: sale.cashier.name,
      },
      items: sale.items.map((item) => {
        const variant = variantById.get(item.refId);
        return {
          id: item.id,
          item_type: item.itemType,
          ref_id: item.refId,
          description: variant
            ? `${variant.product.name} ${variant.size}`
            : `Variant ${item.refId}`,
          qty: Number(item.qty),
          unit_price: Number(item.unitPrice),
          line_total: Number(item.lineTotal),
        };
      }),
      totals: {
        subtotal: Number(sale.subtotal),
        discount_type: sale.discountType,
        discount_value: Number(sale.discountValue),
        discount_amount: Number(sale.discountAmount),
        total: Number(sale.total),
      },
      payments: sale.payments.map((payment) => ({
        id: payment.id,
        method: payment.method,
        amount_received: Number(payment.amountReceived),
        amount_applied: Number(payment.amountApplied),
        change_given: Number(payment.changeGiven),
      })),
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

  private async computeIngredientNeedsFromSaleItems(
    items: Array<{
      itemType: SaleItemType;
      refId: number;
      qty: Prisma.Decimal;
    }>,
  ) {
    const variantItems = items.filter((item) => item.itemType === SaleItemType.VARIANT);
    const variantIds = variantItems.map((item) => item.refId);

    const recipes = await this.prisma.variantRecipeItem.findMany({
      where: {
        variantId: { in: variantIds },
      },
    });

    const recipeByVariant = new Map<number, typeof recipes>();
    for (const recipe of recipes) {
      const group = recipeByVariant.get(recipe.variantId) ?? [];
      group.push(recipe);
      recipeByVariant.set(recipe.variantId, group);
    }

    const totals = new Map<number, number>();
    for (const saleItem of variantItems) {
      const recipeItems = recipeByVariant.get(saleItem.refId);
      if (!recipeItems || recipeItems.length === 0) {
        throw new BadRequestException(
          `Variant ${saleItem.refId} has no recipe configured`,
        );
      }

      for (const recipeItem of recipeItems) {
        const qty = round(
          Number(recipeItem.qtyBaseRequired) * Number(saleItem.qty),
          3,
        );
        totals.set(
          recipeItem.ingredientId,
          round((totals.get(recipeItem.ingredientId) ?? 0) + qty, 3),
        );
      }
    }

    return Array.from(totals.entries()).map(([ingredientId, qtyBase]) => ({
      ingredientId,
      qtyBase,
    }));
  }
}
