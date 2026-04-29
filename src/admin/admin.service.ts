import { Injectable } from "@nestjs/common";
import { Dimension, PaymentMethod, SaleItemType, SaleStatus } from "@prisma/client";
import { BusinessActivityService } from "../business-activity/business-activity.service";
import { PrismaService } from "../prisma/prisma.service";
import { GetAdminActivityQueryDto } from "./dto/get-admin-activity-query.dto";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessActivityService: BusinessActivityService,
  ) {}

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

  async getActivity(query: GetAdminActivityQueryDto) {
    return this.businessActivityService.getFeed(query.page, query.limit, {
      category: query.category,
      search: query.q,
    });
  }

  async getActivityDetail(id: number) {
    return this.businessActivityService.getDetail(id);
  }

  async getRecentActivity() {
    return this.businessActivityService.getLegacyRecentActivity(20);
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
      ? [variant.product.name, variant.size].filter(Boolean).join(" ").trim()
      : `Variant ${variantId}`;
  }
}
