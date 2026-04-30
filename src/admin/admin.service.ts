import { BadRequestException, Injectable } from "@nestjs/common";
import {
  Dimension,
  IngredientMovementType,
  PaymentMethod,
  Prisma,
  SaleItemType,
  SaleStatus,
} from "@prisma/client";
import { BusinessActivityService } from "../business-activity/business-activity.service";
import { round } from "../common/utils/number.util";
import { PrismaService } from "../prisma/prisma.service";
import { GetAdminActivityQueryDto } from "./dto/get-admin-activity-query.dto";
import { GetAdminCashReportQueryDto } from "./dto/get-admin-cash-report-query.dto";
import { GetAdminInventoryReportQueryDto } from "./dto/get-admin-inventory-report-query.dto";
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

type CashReportSessionStatus = "OPEN" | "CLOSED";

type CashReportSessionRow = {
  cash_session_id: number;
  location_id: number;
  location_name: string;
  opened_by_id: number;
  opened_by_name: string;
  closed_by_id: number | null;
  closed_by_name: string | null;
  responsible_id: number;
  responsible_name: string;
  opened_at: Date;
  closed_at: Date | null;
  opening_cash: number;
  cash_sales_total: number | null;
  transfer_sales_total: number | null;
  total_change_given: number | null;
  expected: number | null;
  counted: number | null;
  difference: number | null;
  status: CashReportSessionStatus;
  source: "SNAPSHOT" | "SESSION";
};

type CashSnapshotReportRecord = Prisma.CashClosureSnapshotGetPayload<object>;

type FallbackCashSessionReportRecord = Prisma.CashSessionGetPayload<{
  include: {
    location: true;
    opener: true;
    closer: true;
  };
}>;

type OpenCashSessionReportRecord = Prisma.CashSessionGetPayload<{
  include: {
    location: true;
    opener: true;
  };
}>;

type InventoryReportDailyRow = {
  date: string;
  movement_type: IngredientMovementType;
  movement_count: bigint | number | string;
  quantity_base: Prisma.Decimal | number | string | null;
  net_quantity_base: Prisma.Decimal | number | string | null;
};

type InventoryReportTypeRow = {
  movement_type: IngredientMovementType;
  movement_count: bigint | number | string;
  quantity_base: Prisma.Decimal | number | string | null;
  net_quantity_base: Prisma.Decimal | number | string | null;
};

type InventoryReportTopIngredientRow = {
  ingredient_id: number;
  ingredient_name: string;
  dimension: Dimension;
  movement_count: bigint | number | string;
  total_quantity_base: Prisma.Decimal | number | string | null;
  net_quantity_base: Prisma.Decimal | number | string | null;
};

type InventoryReportMovementRecord = Prisma.IngredientMovementGetPayload<{
  include: {
    ingredient: true;
    location: true;
    adjustedByUser: {
      select: {
        id: true;
        name: true;
        role: true;
      };
    };
  };
}>;

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

  async getCashReport(query: GetAdminCashReportQueryDto) {
    const range = this.buildCashReportDateRange(query);
    const status = query.status ?? "ALL";
    const includeOpen = status === "ALL" || status === "OPEN";
    const includeClosed = status === "ALL" || status === "CLOSED";

    const [snapshotClosures, fallbackClosedSessions, openSessions] =
      await Promise.all([
        includeClosed
          ? this.prisma.cashClosureSnapshot.findMany({
              where: this.buildCashSnapshotWhere(query, range),
              orderBy: { closedAt: "desc" },
            })
          : [],
        includeClosed
          ? this.prisma.cashSession.findMany({
              where: this.buildFallbackClosedCashSessionWhere(query, range),
              include: {
                location: true,
                opener: true,
                closer: true,
              },
              orderBy: { closedAt: "desc" },
            })
          : [],
        includeOpen
          ? this.prisma.cashSession.findMany({
              where: this.buildOpenCashSessionWhere(query, range),
              include: {
                location: true,
                opener: true,
              },
              orderBy: { openedAt: "desc" },
            })
          : [],
      ]);

    const rows = [
      ...snapshotClosures.map((snapshot) =>
        this.mapCashSnapshotToReportRow(snapshot),
      ),
      ...fallbackClosedSessions.map((session) =>
        this.mapFallbackCashSessionToReportRow(session),
      ),
      ...openSessions.map((session) => this.mapOpenCashSessionToReportRow(session)),
    ].sort((left, right) => {
      const leftDate = left.closed_at ?? left.opened_at;
      const rightDate = right.closed_at ?? right.opened_at;
      return rightDate.getTime() - leftDate.getTime();
    });
    const closedRows = rows.filter((row) => row.status === "CLOSED");
    const totalExpected = round(
      closedRows.reduce((sum, row) => sum + (row.expected ?? 0), 0),
      2,
    );
    const totalCounted = round(
      closedRows.reduce((sum, row) => sum + (row.counted ?? 0), 0),
      2,
    );
    const totalDifference = round(
      closedRows.reduce((sum, row) => sum + (row.difference ?? 0), 0),
      2,
    );
    const openCount = rows.filter((row) => row.status === "OPEN").length;
    const closedCount = closedRows.length;

    return {
      filters: {
        from: this.formatDateKey(range.fromDate),
        to: this.formatDateKey(range.toDate),
        location_id: query.locationId ?? null,
        status,
      },
      kpis: {
        open_sessions_count: openCount,
        closed_sessions_count: closedCount,
        total_expected: totalExpected,
        total_counted: totalCounted,
        total_difference: totalDifference,
        average_difference_per_closure:
          closedCount > 0 ? round(totalDifference / closedCount, 2) : 0,
      },
      closures_by_day: this.buildCashClosuresByDay(range, closedRows),
      differences_by_day: this.buildCashDifferencesByDay(range, closedRows),
      expected_vs_counted: [
        {
          label: "Esperado",
          total: totalExpected,
        },
        {
          label: "Contado",
          total: totalCounted,
        },
      ],
      differences_by_closure: closedRows.slice(0, 12).map((row) => ({
        cash_session_id: row.cash_session_id,
        label: `Caja #${row.cash_session_id}`,
        closed_at: row.closed_at,
        difference: row.difference ?? 0,
      })),
      sessions: rows.slice(0, 25).map((row) => ({
        cash_session_id: row.cash_session_id,
        location_id: row.location_id,
        location_name: row.location_name,
        responsible_id: row.responsible_id,
        responsible_name: row.responsible_name,
        opened_by_id: row.opened_by_id,
        opened_by_name: row.opened_by_name,
        closed_by_id: row.closed_by_id,
        closed_by_name: row.closed_by_name,
        opened_at: row.opened_at,
        closed_at: row.closed_at,
        opening_cash: row.opening_cash,
        opening_amount: row.opening_cash,
        cash_sales_total: row.cash_sales_total,
        transfer_sales_total: row.transfer_sales_total,
        total_change_given: row.total_change_given,
        expected: row.expected,
        expected_amount: row.expected,
        counted: row.counted,
        counted_amount: row.counted,
        difference: row.difference,
        status: row.status,
        source: row.source,
      })),
    };
  }

  async getInventoryReport(query: GetAdminInventoryReportQueryDto) {
    const range = this.buildInventoryReportDateRange(query);
    const movementWhere = this.buildInventoryMovementReportWhere(query, range);

    const [
      activeIngredientsCount,
      lowStockItems,
      dailyRows,
      typeRows,
      topIngredientRows,
      recentMovements,
    ] = await Promise.all([
      this.prisma.ingredient.count({
        where: {
          ...(query.ingredientId ? { id: query.ingredientId } : {}),
          ...(query.locationId
            ? {
                stocks: {
                  some: {
                    locationId: query.locationId,
                  },
                },
              }
            : {}),
        },
      }),
      this.getInventoryLowStockItems(query),
      this.getInventoryReportDailyRows(query, range),
      this.getInventoryReportTypeRows(query, range),
      this.getInventoryReportTopIngredientRows(query, range),
      this.prisma.ingredientMovement.findMany({
        where: movementWhere,
        include: {
          ingredient: true,
          location: true,
          adjustedByUser: {
            select: {
              id: true,
              name: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    const countsByType = {
      [IngredientMovementType.ENTRY]: 0,
      [IngredientMovementType.EXIT]: 0,
      [IngredientMovementType.ADJUSTMENT]: 0,
    };

    for (const row of typeRows) {
      countsByType[row.movement_type] = this.toNumber(row.movement_count);
    }

    return {
      filters: {
        from: this.formatDateKey(range.fromDate),
        to: this.formatDateKey(range.toDate),
        location_id: query.locationId ?? null,
        ingredient_id: query.ingredientId ?? null,
        movement_type: query.movementType ?? null,
      },
      kpis: {
        active_ingredients_count: activeIngredientsCount,
        low_stock_ingredients_count: this.countLowStockIngredients(
          lowStockItems,
          query.locationId,
        ),
        entries_count: countsByType.ENTRY,
        exits_count: countsByType.EXIT,
        adjustments_count: countsByType.ADJUSTMENT,
      },
      movements_by_day: this.fillInventoryReportDailyRows(range, dailyRows),
      movements_by_type: typeRows.map((row) => ({
        movement_type: row.movement_type,
        movement_count: this.toNumber(row.movement_count),
        quantity_base: round(this.toNumber(row.quantity_base), 3),
        net_quantity_base: round(this.toNumber(row.net_quantity_base), 3),
      })),
      top_ingredients_by_movement: topIngredientRows.map((row) => ({
        ingredient_id: row.ingredient_id,
        ingredient_name: row.ingredient_name,
        dimension: row.dimension,
        movement_count: this.toNumber(row.movement_count),
        total_quantity_base: round(this.toNumber(row.total_quantity_base), 3),
        net_quantity_base: round(this.toNumber(row.net_quantity_base), 3),
      })),
      stock_low_by_ingredient: lowStockItems.slice(0, 20),
      movements: recentMovements.map((movement) =>
        this.mapInventoryMovementToReportRow(movement),
      ),
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

  private buildInventoryReportDateRange(
    query: GetAdminInventoryReportQueryDto,
  ): SalesReportDateRange {
    const fromDate = this.parseReportDateBoundary(query.from, "from", "start");
    const toDate = this.parseReportDateBoundary(query.to, "to", "end");

    if (fromDate > toDate) {
      throw new BadRequestException("from cannot be greater than to");
    }

    const rangeDays =
      Math.floor(
        (this.startOfDay(toDate).getTime() -
          this.startOfDay(fromDate).getTime()) /
          86_400_000,
      ) + 1;

    if (rangeDays > MAX_REPORT_RANGE_DAYS) {
      throw new BadRequestException(
        `Report range cannot exceed ${MAX_REPORT_RANGE_DAYS} days`,
      );
    }

    return { fromDate, toDate };
  }

  private buildInventoryMovementReportWhere(
    query: GetAdminInventoryReportQueryDto,
    range: SalesReportDateRange,
  ): Prisma.IngredientMovementWhereInput {
    return {
      createdAt: {
        gte: range.fromDate,
        lte: range.toDate,
      },
      ...(query.locationId ? { locationId: query.locationId } : {}),
      ...(query.ingredientId ? { ingredientId: query.ingredientId } : {}),
      ...(query.movementType ? { movementType: query.movementType } : {}),
    };
  }

  private buildInventoryMovementSqlConditions(
    query: GetAdminInventoryReportQueryDto,
    range: SalesReportDateRange,
  ) {
    const conditions = [
      Prisma.sql`m."createdAt" >= ${range.fromDate}`,
      Prisma.sql`m."createdAt" <= ${range.toDate}`,
    ];

    if (query.locationId) {
      conditions.push(Prisma.sql`m."locationId" = ${query.locationId}`);
    }

    if (query.ingredientId) {
      conditions.push(Prisma.sql`m."ingredientId" = ${query.ingredientId}`);
    }

    if (query.movementType) {
      conditions.push(
        Prisma.sql`m."type" = ${query.movementType}::"IngredientMovementType"`,
      );
    }

    return conditions;
  }

  private async getInventoryReportDailyRows(
    query: GetAdminInventoryReportQueryDto,
    range: SalesReportDateRange,
  ) {
    const conditions = this.buildInventoryMovementSqlConditions(query, range);

    return this.prisma.$queryRaw<InventoryReportDailyRow[]>(Prisma.sql`
      SELECT
        to_char(date_trunc('day', m."createdAt"), 'YYYY-MM-DD') AS "date",
        m."type"::text AS "movement_type",
        COUNT(*)::int AS "movement_count",
        COALESCE(SUM(ABS(m."qtyBase")), 0) AS "quantity_base",
        COALESCE(SUM(
          CASE
            WHEN m."type" = 'ENTRY'::"IngredientMovementType" THEN ABS(m."qtyBase")
            WHEN m."type" = 'EXIT'::"IngredientMovementType" THEN -ABS(m."qtyBase")
            ELSE m."qtyBase"
          END
        ), 0) AS "net_quantity_base"
      FROM "IngredientMovement" m
      WHERE ${Prisma.join(conditions, " AND ")}
      GROUP BY date_trunc('day', m."createdAt"), m."type"
      ORDER BY date_trunc('day', m."createdAt") ASC
    `);
  }

  private async getInventoryReportTypeRows(
    query: GetAdminInventoryReportQueryDto,
    range: SalesReportDateRange,
  ) {
    const conditions = this.buildInventoryMovementSqlConditions(query, range);

    return this.prisma.$queryRaw<InventoryReportTypeRow[]>(Prisma.sql`
      SELECT
        m."type"::text AS "movement_type",
        COUNT(*)::int AS "movement_count",
        COALESCE(SUM(ABS(m."qtyBase")), 0) AS "quantity_base",
        COALESCE(SUM(
          CASE
            WHEN m."type" = 'ENTRY'::"IngredientMovementType" THEN ABS(m."qtyBase")
            WHEN m."type" = 'EXIT'::"IngredientMovementType" THEN -ABS(m."qtyBase")
            ELSE m."qtyBase"
          END
        ), 0) AS "net_quantity_base"
      FROM "IngredientMovement" m
      WHERE ${Prisma.join(conditions, " AND ")}
      GROUP BY m."type"
      ORDER BY COUNT(*) DESC
    `);
  }

  private async getInventoryReportTopIngredientRows(
    query: GetAdminInventoryReportQueryDto,
    range: SalesReportDateRange,
  ) {
    const conditions = this.buildInventoryMovementSqlConditions(query, range);

    return this.prisma.$queryRaw<InventoryReportTopIngredientRow[]>(Prisma.sql`
      SELECT
        m."ingredientId" AS "ingredient_id",
        i."name" AS "ingredient_name",
        i."dimension"::text AS "dimension",
        COUNT(*)::int AS "movement_count",
        COALESCE(SUM(ABS(m."qtyBase")), 0) AS "total_quantity_base",
        COALESCE(SUM(
          CASE
            WHEN m."type" = 'ENTRY'::"IngredientMovementType" THEN ABS(m."qtyBase")
            WHEN m."type" = 'EXIT'::"IngredientMovementType" THEN -ABS(m."qtyBase")
            ELSE m."qtyBase"
          END
        ), 0) AS "net_quantity_base"
      FROM "IngredientMovement" m
      INNER JOIN "Ingredient" i ON i."id" = m."ingredientId"
      WHERE ${Prisma.join(conditions, " AND ")}
      GROUP BY m."ingredientId", i."name", i."dimension"
      ORDER BY COALESCE(SUM(ABS(m."qtyBase")), 0) DESC, COUNT(*) DESC
      LIMIT 10
    `);
  }

  private async getInventoryLowStockItems(
    query: Pick<GetAdminInventoryReportQueryDto, "locationId" | "ingredientId">,
  ) {
    const stocks = await this.prisma.ingredientStock.findMany({
      where: {
        ...(query.locationId ? { locationId: query.locationId } : {}),
        ...(query.ingredientId ? { ingredientId: query.ingredientId } : {}),
      },
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
        qty_on_hand_base: round(this.toNumber(stock.qtyOnHandBase), 3),
        threshold: this.getLowStockThreshold(stock.ingredient.dimension),
      }));
  }

  private countLowStockIngredients(
    items: Array<{ ingredient_id: number }>,
    locationId?: number,
  ) {
    if (locationId) {
      return items.length;
    }

    return new Set(items.map((item) => item.ingredient_id)).size;
  }

  private fillInventoryReportDailyRows(
    range: SalesReportDateRange,
    rows: InventoryReportDailyRow[],
  ) {
    const rowsByDate = new Map<
      string,
      {
        date: string;
        entry_count: number;
        exit_count: number;
        adjustment_count: number;
        movement_count: number;
        quantity_base: number;
        net_quantity_base: number;
      }
    >();

    for (const row of rows) {
      const current =
        rowsByDate.get(row.date) ??
        {
          date: row.date,
          entry_count: 0,
          exit_count: 0,
          adjustment_count: 0,
          movement_count: 0,
          quantity_base: 0,
          net_quantity_base: 0,
        };
      const movementCount = this.toNumber(row.movement_count);

      if (row.movement_type === IngredientMovementType.ENTRY) {
        current.entry_count += movementCount;
      }

      if (row.movement_type === IngredientMovementType.EXIT) {
        current.exit_count += movementCount;
      }

      if (row.movement_type === IngredientMovementType.ADJUSTMENT) {
        current.adjustment_count += movementCount;
      }

      current.movement_count += movementCount;
      current.quantity_base = round(
        current.quantity_base + this.toNumber(row.quantity_base),
        3,
      );
      current.net_quantity_base = round(
        current.net_quantity_base + this.toNumber(row.net_quantity_base),
        3,
      );
      rowsByDate.set(row.date, current);
    }

    return this.fillDateRange(range, (date) => {
      const current = rowsByDate.get(date);

      return (
        current ?? {
          date,
          entry_count: 0,
          exit_count: 0,
          adjustment_count: 0,
          movement_count: 0,
          quantity_base: 0,
          net_quantity_base: 0,
        }
      );
    });
  }

  private mapInventoryMovementToReportRow(
    movement: InventoryReportMovementRecord,
  ) {
    const qtyBase = round(this.toNumber(movement.qtyBase), 3);

    return {
      movement_id: movement.id,
      created_at: movement.createdAt,
      ingredient_id: movement.ingredientId,
      ingredient_name: movement.ingredient.name,
      dimension: movement.ingredient.dimension,
      location_id: movement.locationId,
      location_name: movement.location.name,
      movement_type: movement.movementType,
      quantity_base: qtyBase,
      delta_base: round(
        this.getInventoryMovementDelta(movement.movementType, qtyBase),
        3,
      ),
      previous_stock:
        movement.previousStock === null
          ? null
          : round(this.toNumber(movement.previousStock), 3),
      new_stock:
        movement.newStock === null
          ? null
          : round(this.toNumber(movement.newStock), 3),
      counted_stock:
        movement.countedStock === null
          ? null
          : round(this.toNumber(movement.countedStock), 3),
      responsible_id: movement.adjustedByUser.id,
      responsible_name: movement.adjustedByUser.name,
      reason: movement.notes,
      reason_code: movement.reasonCode,
      support_document: movement.supportDocument,
      reference_type: movement.referenceType,
      reference_id: movement.referenceId,
    };
  }

  private getInventoryMovementDelta(
    movementType: IngredientMovementType,
    qtyBase: number,
  ) {
    if (movementType === IngredientMovementType.EXIT) {
      return -Math.abs(qtyBase);
    }

    if (movementType === IngredientMovementType.ENTRY) {
      return Math.abs(qtyBase);
    }

    return qtyBase;
  }

  private buildCashReportDateRange(
    query: GetAdminCashReportQueryDto,
  ): SalesReportDateRange {
    const fromDate = this.parseReportDateBoundary(query.from, "from", "start");
    const toDate = this.parseReportDateBoundary(query.to, "to", "end");

    if (fromDate > toDate) {
      throw new BadRequestException("from cannot be greater than to");
    }

    const rangeDays =
      Math.floor(
        (this.startOfDay(toDate).getTime() -
          this.startOfDay(fromDate).getTime()) /
          86_400_000,
      ) + 1;

    if (rangeDays > MAX_REPORT_RANGE_DAYS) {
      throw new BadRequestException(
        `Report range cannot exceed ${MAX_REPORT_RANGE_DAYS} days`,
      );
    }

    return { fromDate, toDate };
  }

  private buildCashSnapshotWhere(
    query: GetAdminCashReportQueryDto,
    range: SalesReportDateRange,
  ): Prisma.CashClosureSnapshotWhereInput {
    return {
      closedAt: {
        gte: range.fromDate,
        lte: range.toDate,
      },
      ...(query.locationId ? { locationId: query.locationId } : {}),
    };
  }

  private buildFallbackClosedCashSessionWhere(
    query: GetAdminCashReportQueryDto,
    range: SalesReportDateRange,
  ): Prisma.CashSessionWhereInput {
    return {
      closedAt: {
        gte: range.fromDate,
        lte: range.toDate,
      },
      closureSnapshot: null,
      ...(query.locationId ? { locationId: query.locationId } : {}),
    };
  }

  private buildOpenCashSessionWhere(
    query: GetAdminCashReportQueryDto,
    range: SalesReportDateRange,
  ): Prisma.CashSessionWhereInput {
    return {
      closedAt: null,
      openedAt: {
        gte: range.fromDate,
        lte: range.toDate,
      },
      ...(query.locationId ? { locationId: query.locationId } : {}),
    };
  }

  private mapCashSnapshotToReportRow(
    snapshot: CashSnapshotReportRecord,
  ): CashReportSessionRow {
    return {
      cash_session_id: snapshot.cashSessionId,
      location_id: snapshot.locationId,
      location_name: snapshot.locationName,
      opened_by_id: snapshot.openedById,
      opened_by_name: snapshot.openedByName,
      closed_by_id: snapshot.closedById,
      closed_by_name: snapshot.closedByName,
      responsible_id: snapshot.closedById,
      responsible_name: snapshot.closedByName,
      opened_at: snapshot.openedAt,
      closed_at: snapshot.closedAt,
      opening_cash: this.toNumber(snapshot.openingCash),
      cash_sales_total: this.toNumber(snapshot.cashSalesTotal),
      transfer_sales_total: this.toNumber(snapshot.transferSalesTotal),
      total_change_given: this.toNumber(snapshot.totalChangeGiven),
      expected: this.toNumber(snapshot.closingCashExpected),
      counted: this.toNumber(snapshot.closingCashCounted),
      difference: this.toNumber(snapshot.difference),
      status: "CLOSED",
      source: "SNAPSHOT",
    };
  }

  private mapFallbackCashSessionToReportRow(
    session: FallbackCashSessionReportRecord,
  ): CashReportSessionRow {
    const expected =
      session.closingCashExpected === null
        ? null
        : this.toNumber(session.closingCashExpected);
    const counted =
      session.closingCashCounted === null
        ? null
        : this.toNumber(session.closingCashCounted);
    const difference =
      expected === null || counted === null ? null : round(counted - expected, 2);
    const closer = session.closer ?? session.opener;

    return {
      cash_session_id: session.id,
      location_id: session.locationId,
      location_name: session.location.name,
      opened_by_id: session.openedBy,
      opened_by_name: session.opener.name,
      closed_by_id: closer.id,
      closed_by_name: closer.name,
      responsible_id: closer.id,
      responsible_name: closer.name,
      opened_at: session.openedAt,
      closed_at: session.closedAt,
      opening_cash: this.toNumber(session.openingCash),
      cash_sales_total: null,
      transfer_sales_total: null,
      total_change_given: null,
      expected,
      counted,
      difference,
      status: "CLOSED",
      source: "SESSION",
    };
  }

  private mapOpenCashSessionToReportRow(
    session: OpenCashSessionReportRecord,
  ): CashReportSessionRow {
    return {
      cash_session_id: session.id,
      location_id: session.locationId,
      location_name: session.location.name,
      opened_by_id: session.openedBy,
      opened_by_name: session.opener.name,
      closed_by_id: null,
      closed_by_name: null,
      responsible_id: session.openedBy,
      responsible_name: session.opener.name,
      opened_at: session.openedAt,
      closed_at: null,
      opening_cash: this.toNumber(session.openingCash),
      cash_sales_total: null,
      transfer_sales_total: null,
      total_change_given: null,
      expected: null,
      counted: null,
      difference: null,
      status: "OPEN",
      source: "SESSION",
    };
  }

  private buildCashClosuresByDay(
    range: SalesReportDateRange,
    rows: CashReportSessionRow[],
  ) {
    const totals = new Map<string, number>();

    for (const row of rows) {
      if (!row.closed_at) continue;
      const dateKey = this.formatDateKey(row.closed_at);
      totals.set(dateKey, (totals.get(dateKey) ?? 0) + 1);
    }

    return this.fillDateRange(range, (date) => ({
      date,
      closed_count: totals.get(date) ?? 0,
    }));
  }

  private buildCashDifferencesByDay(
    range: SalesReportDateRange,
    rows: CashReportSessionRow[],
  ) {
    const totals = new Map<
      string,
      { difference: number; expected: number; counted: number }
    >();

    for (const row of rows) {
      if (!row.closed_at) continue;
      const dateKey = this.formatDateKey(row.closed_at);
      const current = totals.get(dateKey) ?? {
        difference: 0,
        expected: 0,
        counted: 0,
      };
      totals.set(dateKey, {
        difference: round(current.difference + (row.difference ?? 0), 2),
        expected: round(current.expected + (row.expected ?? 0), 2),
        counted: round(current.counted + (row.counted ?? 0), 2),
      });
    }

    return this.fillDateRange(range, (date) => {
      const current = totals.get(date);
      return {
        date,
        difference: current?.difference ?? 0,
        expected: current?.expected ?? 0,
        counted: current?.counted ?? 0,
      };
    });
  }

  private fillDateRange<T>(
    range: SalesReportDateRange,
    buildItem: (date: string) => T,
  ) {
    const items: T[] = [];
    const cursor = this.startOfDay(range.fromDate);
    const last = this.startOfDay(range.toDate);

    while (cursor <= last) {
      items.push(buildItem(this.formatDateKey(cursor)));
      cursor.setDate(cursor.getDate() + 1);
    }

    return items;
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
