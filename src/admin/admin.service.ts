import { Injectable } from "@nestjs/common";
import {
  Dimension,
  IngredientMovementReferenceType,
  IngredientMovementType,
  PaymentMethod,
  SaleItemType,
  SaleStatus,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

interface ActivityItem {
  activity_type: "SALE" | "CASH_SESSION" | "STOCK_ADJUSTMENT";
  action: string;
  created_at: Date;
  entity_id: number;
  title: string;
  subtitle: string;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const startOfToday = this.getStartOfToday();

    const [salesToday, currentCashSession, activeProductsCount, lowStockItems] =
      await Promise.all([
        this.prisma.sale.findMany({
          where: {
            status: SaleStatus.PAID,
            createdAt: {
              gte: startOfToday,
            },
          },
        }),
        this.prisma.cashSession.findFirst({
          where: {
            closedAt: null,
          },
          include: {
            location: true,
            opener: true,
          },
          orderBy: { openedAt: "desc" },
        }),
        this.prisma.product.count({
          where: { active: true },
        }),
        this.getLowStock(),
      ]);

    const salesTodayTotal = salesToday.reduce(
      (sum, sale) => sum + Number(sale.total),
      0,
    );
    const salesCount = salesToday.length;
    const averageTicket = salesCount > 0 ? salesTodayTotal / salesCount : 0;

    return {
      sales_today_total: salesTodayTotal,
      sales_count: salesCount,
      average_ticket: averageTicket,
      current_cash_session: currentCashSession
        ? {
            id: currentCashSession.id,
            location_id: currentCashSession.locationId,
            location_name: currentCashSession.location.name,
            opened_by: currentCashSession.openedBy,
            opened_by_name: currentCashSession.opener.name,
            opened_at: currentCashSession.openedAt,
            opening_cash: Number(currentCashSession.openingCash),
          }
        : null,
      active_products_count: activeProductsCount,
      low_stock_count: lowStockItems.length,
    };
  }

  async getSalesByPayment() {
    const payments = await this.prisma.payment.findMany({
      where: {
        sale: {
          status: SaleStatus.PAID,
        },
      },
    });

    const totals = {
      CASH: 0,
      TRANSFER: 0,
    };

    for (const payment of payments) {
      totals[payment.method] += Number(payment.amountApplied);
    }

    return {
      items: [
        {
          method: PaymentMethod.CASH,
          total: totals.CASH,
        },
        {
          method: PaymentMethod.TRANSFER,
          total: totals.TRANSFER,
        },
      ],
    };
  }

  async getTopItems() {
    const saleItems = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          status: SaleStatus.PAID,
        },
      },
    });

    const grouped = new Map<
      string,
      { item_type: SaleItemType; ref_id: number; qty_sold: number }
    >();

    for (const item of saleItems) {
      const key = `${item.itemType}-${item.refId}`;
      const current = grouped.get(key);
      grouped.set(key, {
        item_type: item.itemType,
        ref_id: item.refId,
        qty_sold: (current?.qty_sold ?? 0) + Number(item.qty),
      });
    }

    const variantIds = Array.from(grouped.values())
      .filter((item) => item.item_type === SaleItemType.VARIANT)
      .map((item) => item.ref_id);
    const comboIds = Array.from(grouped.values())
      .filter((item) => item.item_type === SaleItemType.COMBO)
      .map((item) => item.ref_id);

    const [variants, combos] = await Promise.all([
      this.prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        include: { product: true },
      }),
      this.prisma.combo.findMany({
        where: { id: { in: comboIds } },
      }),
    ]);

    const variantById = new Map(
      variants.map((variant) => [variant.id, variant]),
    );
    const comboById = new Map(combos.map((combo) => [combo.id, combo]));

    return {
      items: Array.from(grouped.values())
        .map((item) => ({
          name:
            item.item_type === SaleItemType.VARIANT
              ? this.formatVariantName(item.ref_id, variantById)
              : (comboById.get(item.ref_id)?.name ?? `Combo ${item.ref_id}`),
          item_type: item.item_type,
          qty_sold: item.qty_sold,
        }))
        .sort((left, right) => right.qty_sold - left.qty_sold)
        .slice(0, 10),
    };
  }

  async getLowStock() {
    const stocks = await this.prisma.ingredientStock.findMany({
      include: {
        ingredient: true,
        location: true,
      },
      orderBy: [{ ingredient: { name: "asc" } }],
    });

    return stocks
      .filter((stock) => {
        const qty = Number(stock.qtyOnHandBase);
        const threshold = this.getLowStockThreshold(stock.ingredient.dimension);
        return qty <= threshold;
      })
      .map((stock) => ({
        ingredient_id: stock.ingredientId,
        ingredient_name: stock.ingredient.name,
        dimension: stock.ingredient.dimension,
        location_id: stock.locationId,
        location_name: stock.location.name,
        qty_on_hand_base: Number(stock.qtyOnHandBase),
        threshold: this.getLowStockThreshold(stock.ingredient.dimension),
      }));
  }

  async getRecentActivity() {
    const [recentSales, recentSessions, recentMovements] = await Promise.all([
      this.prisma.sale.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          location: true,
          cashier: true,
        },
      }),
      this.prisma.cashSession.findMany({
        take: 10,
        orderBy: { openedAt: "desc" },
        include: {
          location: true,
          opener: true,
        },
      }),
      this.prisma.ingredientMovement.findMany({
        take: 10,
        where: {
          OR: [
            { referenceType: IngredientMovementReferenceType.MANUAL },
            { referenceType: null },
          ],
        },
        orderBy: { createdAt: "desc" },
        include: {
          ingredient: true,
          location: true,
          adjustedByUser: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    const salesActivity: ActivityItem[] = recentSales.map((sale) => ({
      activity_type: "SALE",
      action: sale.status === SaleStatus.PAID ? "SALE_PAID" : "SALE_CREATED",
      created_at: sale.createdAt,
      entity_id: sale.id,
      title: `Venta #${sale.id}`,
      subtitle: `${sale.location.name} · ${sale.cashier.name} · ${Number(sale.total)}`,
    }));

    const sessionActivity: ActivityItem[] = recentSessions.flatMap(
      (session) => {
        const items: ActivityItem[] = [
          {
            activity_type: "CASH_SESSION",
            action: "CASH_OPENED",
            created_at: session.openedAt,
            entity_id: session.id,
            title: `Caja #${session.id} abierta`,
            subtitle: `${session.location.name} · ${session.opener.name}`,
          },
        ];

        if (session.closedAt) {
          items.push({
            activity_type: "CASH_SESSION",
            action: "CASH_CLOSED",
            created_at: session.closedAt,
            entity_id: session.id,
            title: `Caja #${session.id} cerrada`,
            subtitle: `${session.location.name} · esperado ${Number(session.closingCashExpected ?? 0)}`,
          });
        }

        return items;
      },
    );

    const stockActivity: ActivityItem[] = recentMovements.map((movement) => ({
      activity_type: "STOCK_ADJUSTMENT",
      action: this.resolveMovementAction(movement.movementType),
      created_at: movement.createdAt,
      entity_id: movement.id,
      title: this.resolveMovementTitle(
        movement.movementType,
        movement.ingredient.name,
      ),
      subtitle: `${movement.location.name} · ${movement.adjustedByUser.name} · ${this.formatMovementDelta(movement.movementType, Number(movement.qtyBase))}`,
    }));

    return {
      items: [...salesActivity, ...sessionActivity, ...stockActivity]
        .sort(
          (left, right) =>
            right.created_at.getTime() - left.created_at.getTime(),
        )
        .slice(0, 20)
        .map((item) => ({
          ...item,
          created_at: item.created_at,
        })),
    };
  }

  private getStartOfToday() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private getLowStockThreshold(dimension: Dimension) {
    if (dimension === Dimension.COUNT) {
      return 10;
    }

    return 500;
  }

  private formatVariantName(
    variantId: number,
    variants: Map<number, { product: { name: string }; size: string }>,
  ) {
    const variant = variants.get(variantId);
    return variant
      ? [variant.product.name, variant.size].filter(Boolean).join(' ').trim()
      : `Variant ${variantId}`;
  }

  private resolveMovementAction(movementType: IngredientMovementType) {
    if (movementType === IngredientMovementType.ENTRY) {
      return "STOCK_ENTRY_CREATED";
    }

    if (movementType === IngredientMovementType.EXIT) {
      return "STOCK_EXIT_CREATED";
    }

    return "STOCK_ADJUSTED";
  }

  private resolveMovementTitle(
    movementType: IngredientMovementType,
    ingredientName: string,
  ) {
    if (movementType === IngredientMovementType.ENTRY) {
      return `Entrada de ${ingredientName}`;
    }

    if (movementType === IngredientMovementType.EXIT) {
      return `Salida de ${ingredientName}`;
    }

    return `Ajuste de ${ingredientName}`;
  }

  private formatMovementDelta(
    movementType: IngredientMovementType,
    qtyBase: number,
  ) {
    if (movementType === IngredientMovementType.ADJUSTMENT) {
      return `${qtyBase >= 0 ? "+" : ""}${qtyBase}`;
    }

    return `${movementType === IngredientMovementType.EXIT ? "-" : "+"}${qtyBase}`;
  }
}
