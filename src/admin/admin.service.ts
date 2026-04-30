import { BadRequestException, Injectable } from "@nestjs/common";
import {
  Dimension,
  PaymentMethod,
  Prisma,
  SaleItemType,
  SaleStatus,
} from "@prisma/client";
import { BusinessActivityService } from "../business-activity/business-activity.service";
import { PrismaService } from "../prisma/prisma.service";
import { GetAdminActivityQueryDto } from "./dto/get-admin-activity-query.dto";
import { GetAdminSalesReportQueryDto } from "./dto/get-admin-sales-report-query.dto";

const MAX_REPORT_RANGE_DAYS = 366;

type SalesReportDateRange = {
  fromDate: Date;
  toDate: Date;
};

type DailySalesReportRow = {
  date: string;
  total: Prisma.Decimal | number | string | null;
  sales_count: bigint | number | string;
};

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

  async getSalesReport(query: GetAdminSalesReportQueryDto) {
    const range = this.buildSalesReportDateRange(query);
    const baseSaleWhere = this.buildSalesReportBaseWhere(query, range);
    const saleWhere = this.buildSalesReportWhere(query, range);

    const [salesAggregate, paymentsByMethod, dailyRows, topItems] =
      await Promise.all([
        this.prisma.sale.aggregate({
          where: saleWhere,
          _count: { _all: true },
          _sum: { total: true },
        }),
        this.prisma.payment.groupBy({
          by: ["method"],
          where: {
            sale: baseSaleWhere,
            ...(query.paymentMethod ? { method: query.paymentMethod } : {}),
          },
          _sum: { amountApplied: true },
        }),
        this.getSalesReportDailyRows(query, range),
        this.prisma.saleItem.groupBy({
          by: ["itemType", "refId"],
          where: {
            sale: saleWhere,
          },
          _sum: {
            qty: true,
            lineTotal: true,
          },
          orderBy: [
            { _sum: { qty: "desc" } },
            { _sum: { lineTotal: "desc" } },
          ],
          take: 10,
        }),
      ]);

    const paymentTotals = {
      [PaymentMethod.CASH]: 0,
      [PaymentMethod.TRANSFER]: 0,
    };

    for (const item of paymentsByMethod) {
      paymentTotals[item.method] = this.toNumber(item._sum.amountApplied);
    }

    const salesCount = salesAggregate._count._all;
    const totalSold = this.toNumber(salesAggregate._sum.total);

    return {
      filters: {
        from: this.formatDateKey(range.fromDate),
        to: this.formatDateKey(range.toDate),
        location_id: query.locationId ?? null,
        payment_method: query.paymentMethod ?? null,
      },
      kpis: {
        total_sold: totalSold,
        sales_count: salesCount,
        average_ticket: salesCount > 0 ? totalSold / salesCount : 0,
        total_cash: paymentTotals.CASH,
        total_transfer: paymentTotals.TRANSFER,
      },
      sales_by_day: this.fillSalesReportDailyRows(range, dailyRows),
      sales_by_payment: [
        {
          method: PaymentMethod.CASH,
          total: paymentTotals.CASH,
        },
        {
          method: PaymentMethod.TRANSFER,
          total: paymentTotals.TRANSFER,
        },
      ],
      top_products: await this.buildSalesReportTopProducts(topItems),
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

  private buildSalesReportDateRange(
    query: GetAdminSalesReportQueryDto,
  ): SalesReportDateRange {
    const fromDate = this.parseReportDateBoundary(query.from, "from", "start");
    const toDate = this.parseReportDateBoundary(query.to, "to", "end");

    if (fromDate > toDate) {
      throw new BadRequestException("from cannot be greater than to");
    }

    const rangeDays =
      Math.floor(
        (this.startOfDay(toDate).getTime() - this.startOfDay(fromDate).getTime()) /
          86_400_000,
      ) + 1;

    if (rangeDays > MAX_REPORT_RANGE_DAYS) {
      throw new BadRequestException(
        `Report range cannot exceed ${MAX_REPORT_RANGE_DAYS} days`,
      );
    }

    return { fromDate, toDate };
  }

  private buildSalesReportBaseWhere(
    query: GetAdminSalesReportQueryDto,
    range: SalesReportDateRange,
  ): Prisma.SaleWhereInput {
    return {
      status: SaleStatus.PAID,
      createdAt: {
        gte: range.fromDate,
        lte: range.toDate,
      },
      ...(query.locationId ? { locationId: query.locationId } : {}),
    };
  }

  private buildSalesReportWhere(
    query: GetAdminSalesReportQueryDto,
    range: SalesReportDateRange,
  ): Prisma.SaleWhereInput {
    return {
      ...this.buildSalesReportBaseWhere(query, range),
      ...(query.paymentMethod
        ? {
            payments: {
              some: {
                method: query.paymentMethod,
              },
            },
          }
        : {}),
    };
  }

  private async getSalesReportDailyRows(
    query: GetAdminSalesReportQueryDto,
    range: SalesReportDateRange,
  ) {
    const conditions = [
      Prisma.sql`s."status" = 'PAID'::"SaleStatus"`,
      Prisma.sql`s."createdAt" >= ${range.fromDate}`,
      Prisma.sql`s."createdAt" <= ${range.toDate}`,
    ];

    if (query.locationId) {
      conditions.push(Prisma.sql`s."locationId" = ${query.locationId}`);
    }

    if (query.paymentMethod) {
      conditions.push(Prisma.sql`EXISTS (
        SELECT 1
        FROM "Payment" p
        WHERE p."saleId" = s."id"
          AND p."method" = ${query.paymentMethod}::"PaymentMethod"
      )`);
    }

    return this.prisma.$queryRaw<DailySalesReportRow[]>(Prisma.sql`
      SELECT
        to_char(date_trunc('day', s."createdAt"), 'YYYY-MM-DD') AS "date",
        COALESCE(SUM(s."total"), 0) AS "total",
        COUNT(*)::int AS "sales_count"
      FROM "Sale" s
      WHERE ${Prisma.join(conditions, " AND ")}
      GROUP BY date_trunc('day', s."createdAt")
      ORDER BY date_trunc('day', s."createdAt") ASC
    `);
  }

  private fillSalesReportDailyRows(
    range: SalesReportDateRange,
    rows: DailySalesReportRow[],
  ) {
    const rowsByDate = new Map(
      rows.map((row) => [
        row.date,
        {
          date: row.date,
          total: this.toNumber(row.total),
          sales_count: this.toNumber(row.sales_count),
        },
      ]),
    );
    const items: Array<{ date: string; total: number; sales_count: number }> =
      [];
    const cursor = this.startOfDay(range.fromDate);
    const last = this.startOfDay(range.toDate);

    while (cursor <= last) {
      const dateKey = this.formatDateKey(cursor);
      items.push(rowsByDate.get(dateKey) ?? {
        date: dateKey,
        total: 0,
        sales_count: 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return items;
  }

  private async buildSalesReportTopProducts(
    groupedItems: Array<{
      itemType: SaleItemType;
      refId: number;
      _sum: {
        qty: Prisma.Decimal | null;
        lineTotal: Prisma.Decimal | null;
      };
    }>,
  ) {
    const variantIds = groupedItems
      .filter((item) => item.itemType === SaleItemType.VARIANT)
      .map((item) => item.refId);
    const comboIds = groupedItems
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

    const variantById = new Map(
      variants.map((variant) => [variant.id, variant]),
    );
    const comboById = new Map(combos.map((combo) => [combo.id, combo]));

    return groupedItems.map((item) => ({
      name:
        item.itemType === SaleItemType.VARIANT
          ? this.formatVariantName(item.refId, variantById)
          : (comboById.get(item.refId)?.name ?? `Combo ${item.refId}`),
      item_type: item.itemType,
      ref_id: item.refId,
      qty_sold: this.toNumber(item._sum.qty),
      total_sold: this.toNumber(item._sum.lineTotal),
    }));
  }

  private parseReportDateBoundary(
    value: string,
    field: "from" | "to",
    boundary: "start" | "end",
  ) {
    const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
    const normalized = dateOnlyPattern.test(value)
      ? `${value}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}`
      : value;
    const date = new Date(normalized);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid date`);
    }

    return date;
  }

  private startOfDay(value: Date) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private formatDateKey(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private toNumber(
    value:
      | Prisma.Decimal
      | number
      | string
      | bigint
      | null
      | undefined,
  ) {
    return Number(value ?? 0);
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
