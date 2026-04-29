import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BusinessActivityEntityType,
  BusinessActivityType,
  IngredientMovementReferenceType,
  IngredientMovementType,
  Prisma,
  SaleItemType,
  SaleStatus,
} from '@prisma/client';
import { round } from '../common/utils/number.util';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ActivityActorReference,
  ActivityLocationReference,
  BusinessActivityDetailItem,
  BusinessActivityDetailPayload,
  BusinessActivityFeedResponse,
  BusinessActivityListItem,
  BusinessActivityNavigationTarget,
  BusinessActivitySummaryPayload,
  CashClosedActivityDetail,
  CashClosedActivitySummary,
  CashOpenedActivityDetail,
  CashOpenedActivitySummary,
  SaleCompletedActivityDetail,
  SaleCompletedActivityLineItem,
  SaleCompletedActivitySummary,
  StockMovementActivityDetail,
  StockMovementActivitySummary,
} from './business-activity.types';

type PrismaClientLike = Prisma.TransactionClient | PrismaService;
type BusinessActivityRecord = Prisma.BusinessActivityGetPayload<object>;

type HistoricalCashSessionRecord = Prisma.CashSessionGetPayload<{
  include: {
    location: true;
    opener: true;
    closer: true;
  };
}>;

type HistoricalSaleRecord = Prisma.SaleGetPayload<{
  include: {
    items: true;
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

type HistoricalStockMovementRecord = Prisma.IngredientMovementGetPayload<{
  include: {
    ingredient: true;
    location: true;
    adjustedByUser: {
      select: {
        id: true;
        name: true;
      };
    };
  };
}>;

interface RecordCashOpenedInput {
  cash_session_id: number;
  opened_at: Date;
  opening_cash: number;
  location: {
    id: number;
    name: string;
  };
  responsible: {
    id: number;
    name: string;
  };
}

interface RecordCashClosedInput {
  cash_session_id: number;
  opened_at: Date;
  closed_at: Date;
  opening_cash: number;
  cash_sales_total: number;
  transfer_sales_total: number;
  total_change_given: number;
  closing_cash_expected: number;
  closing_cash_counted: number;
  difference: number;
  location: {
    id: number;
    name: string;
  };
  opened_by: {
    id: number;
    name: string;
  };
  closed_by: {
    id: number;
    name: string;
  };
}

const historicalSaleInclude = {
  items: true,
  payments: {
    orderBy: { id: 'desc' },
    take: 1,
  },
  location: true,
  cashier: true,
} satisfies Prisma.SaleInclude;

const historicalStockMovementInclude = {
  ingredient: true,
  location: true,
  adjustedByUser: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.IngredientMovementInclude;

@Injectable()
export class BusinessActivityService {
  private historicalSyncPromise: Promise<void> | null = null;
  private historicalRecordsReady = false;

  constructor(private readonly prisma: PrismaService) {}

  async recordCashOpened(client: PrismaClientLike, input: RecordCashOpenedInput) {
    const summary: CashOpenedActivitySummary = {
      cash_session_id: input.cash_session_id,
      opened_at: input.opened_at.toISOString(),
      opening_cash: input.opening_cash,
      responsible_name: input.responsible.name,
      location_name: input.location.name,
    };

    const detail: CashOpenedActivityDetail = {
      ...summary,
      location_id: input.location.id,
      responsible_id: input.responsible.id,
    };

    await this.upsertActivity(client, {
      event_key: this.buildEventKey(
        BusinessActivityType.CASH_OPENED,
        BusinessActivityEntityType.CASH_SESSION,
        input.cash_session_id,
      ),
      activity_type: BusinessActivityType.CASH_OPENED,
      entity_type: BusinessActivityEntityType.CASH_SESSION,
      entity_id: input.cash_session_id,
      occurred_at: input.opened_at,
      actor: {
        user_id: input.responsible.id,
        user_name: input.responsible.name,
      },
      location: {
        location_id: input.location.id,
        location_name: input.location.name,
      },
      title: `Caja #${input.cash_session_id} abierta`,
      subtitle: `${input.location.name} · ${input.responsible.name}`,
      summary,
      detail,
    });
  }

  async recordCashClosed(client: PrismaClientLike, input: RecordCashClosedInput) {
    const snapshot = {
      opening_cash: input.opening_cash,
      cash_sales_total: input.cash_sales_total,
      transfer_sales_total: input.transfer_sales_total,
      total_change_given: input.total_change_given,
      closing_cash_expected: input.closing_cash_expected,
      closing_cash_counted: input.closing_cash_counted,
      difference: input.difference,
    };

    await client.cashClosureSnapshot.upsert({
      where: {
        cashSessionId: input.cash_session_id,
      },
      update: {
        locationId: input.location.id,
        locationName: input.location.name,
        openedById: input.opened_by.id,
        openedByName: input.opened_by.name,
        closedById: input.closed_by.id,
        closedByName: input.closed_by.name,
        openedAt: input.opened_at,
        closedAt: input.closed_at,
        openingCash: input.opening_cash,
        cashSalesTotal: input.cash_sales_total,
        transferSalesTotal: input.transfer_sales_total,
        totalChangeGiven: input.total_change_given,
        closingCashExpected: input.closing_cash_expected,
        closingCashCounted: input.closing_cash_counted,
        difference: input.difference,
        summaryJson: this.toJson(snapshot),
      },
      create: {
        cashSessionId: input.cash_session_id,
        locationId: input.location.id,
        locationName: input.location.name,
        openedById: input.opened_by.id,
        openedByName: input.opened_by.name,
        closedById: input.closed_by.id,
        closedByName: input.closed_by.name,
        openedAt: input.opened_at,
        closedAt: input.closed_at,
        openingCash: input.opening_cash,
        cashSalesTotal: input.cash_sales_total,
        transferSalesTotal: input.transfer_sales_total,
        totalChangeGiven: input.total_change_given,
        closingCashExpected: input.closing_cash_expected,
        closingCashCounted: input.closing_cash_counted,
        difference: input.difference,
        summaryJson: this.toJson(snapshot),
      },
    });

    const summary: CashClosedActivitySummary = {
      cash_session_id: input.cash_session_id,
      opened_at: input.opened_at.toISOString(),
      closed_at: input.closed_at.toISOString(),
      opening_cash: input.opening_cash,
      expected: input.closing_cash_expected,
      counted: input.closing_cash_counted,
      difference: input.difference,
      responsible_name: input.closed_by.name,
      location_name: input.location.name,
    };

    const detail: CashClosedActivityDetail = {
      ...summary,
      location_id: input.location.id,
      opened_by_id: input.opened_by.id,
      opened_by_name: input.opened_by.name,
      closed_by_id: input.closed_by.id,
      closed_by_name: input.closed_by.name,
      cash_sales_total: input.cash_sales_total,
      transfer_sales_total: input.transfer_sales_total,
      total_change_given: input.total_change_given,
      summary_snapshot: snapshot,
    };

    await this.upsertActivity(client, {
      event_key: this.buildEventKey(
        BusinessActivityType.CASH_CLOSED,
        BusinessActivityEntityType.CASH_SESSION,
        input.cash_session_id,
      ),
      activity_type: BusinessActivityType.CASH_CLOSED,
      entity_type: BusinessActivityEntityType.CASH_SESSION,
      entity_id: input.cash_session_id,
      occurred_at: input.closed_at,
      actor: {
        user_id: input.closed_by.id,
        user_name: input.closed_by.name,
      },
      location: {
        location_id: input.location.id,
        location_name: input.location.name,
      },
      title: `Caja #${input.cash_session_id} cerrada`,
      subtitle: `${input.location.name} · esperado ${input.closing_cash_expected}`,
      summary,
      detail,
    });
  }

  async recordSaleCompleted(client: PrismaClientLike, saleId: number) {
    const sale = await client.sale.findUnique({
      where: { id: saleId },
      include: historicalSaleInclude,
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    await this.persistSaleCompleted(client, sale);
  }

  async recordManualStockMovement(client: PrismaClientLike, movementId: number) {
    const movement = await client.ingredientMovement.findUnique({
      where: { id: movementId },
      include: historicalStockMovementInclude,
    });

    if (!movement) {
      throw new NotFoundException('Stock movement not found');
    }

    if (movement.referenceType === IngredientMovementReferenceType.SALE) {
      return;
    }

    await this.persistStockMovement(client, movement);
  }

  async getFeed(
    page: number,
    limit: number,
    filters: {
      category?: 'ALL' | 'CASH' | 'SALES' | 'INVENTORY' | 'CONFIG';
      search?: string;
    } = {},
  ): Promise<BusinessActivityFeedResponse> {
    await this.ensureHistoricalRecords();

    const skip = (page - 1) * limit;
    const where = this.buildFeedWhere(filters);
    const [total, records] = await Promise.all([
      this.prisma.businessActivity.count({ where }),
      this.prisma.businessActivity.findMany({
        where,
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        skip,
        take: limit,
      }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      items: records.map((record) => this.mapRecordToListItem(record)),
      total,
      page,
      limit,
      total_pages: totalPages,
      has_previous_page: page > 1,
      has_next_page: page < totalPages,
    };
  }

  async getDetail(id: number): Promise<BusinessActivityDetailItem> {
    await this.ensureHistoricalRecords();

    const record = await this.prisma.businessActivity.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('Business activity not found');
    }

    return this.mapRecordToDetailItem(record);
  }

  async getLegacyRecentActivity(limit: number) {
    const feed = await this.getFeed(1, limit);

    return {
      items: feed.items.map((item) => ({
        activity_type: this.toLegacyActivityType(item.activity_type),
        action: this.toLegacyAction(item.activity_type, item.summary),
        created_at: item.occurred_at,
        entity_id: item.entity_id,
        title: item.title,
        subtitle: item.subtitle,
      })),
    };
  }

  private async ensureHistoricalRecords() {
    if (this.historicalRecordsReady) {
      return;
    }

    if (!this.historicalSyncPromise) {
      this.historicalSyncPromise = this.syncHistoricalRecords()
        .then(() => {
          this.historicalRecordsReady = true;
        })
        .finally(() => {
          this.historicalSyncPromise = null;
        });
    }

    await this.historicalSyncPromise;
  }

  private async syncHistoricalRecords() {
    await this.backfillCashSessions();
    await this.backfillSales();
    await this.backfillManualStockMovements();
  }

  private async backfillCashSessions() {
    const sessions = await this.prisma.cashSession.findMany({
      include: {
        location: true,
        opener: true,
        closer: true,
      },
      orderBy: { openedAt: 'asc' },
    });

    for (const session of sessions) {
      await this.recordCashOpened(this.prisma, {
        cash_session_id: session.id,
        opened_at: session.openedAt,
        opening_cash: Number(session.openingCash),
        location: {
          id: session.location.id,
          name: session.location.name,
        },
        responsible: {
          id: session.opener.id,
          name: session.opener.name,
        },
      });

      if (!session.closedAt) {
        continue;
      }

      const summary = await this.computeHistoricalCashCloseSummary(session);
      const closer = session.closer ?? session.opener;

      await this.recordCashClosed(this.prisma, {
        cash_session_id: session.id,
        opened_at: session.openedAt,
        closed_at: session.closedAt,
        opening_cash: Number(session.openingCash),
        cash_sales_total: summary.cash_sales_total,
        transfer_sales_total: summary.transfer_sales_total,
        total_change_given: summary.total_change_given,
        closing_cash_expected: summary.closing_cash_expected,
        closing_cash_counted: summary.closing_cash_counted,
        difference: summary.difference,
        location: {
          id: session.location.id,
          name: session.location.name,
        },
        opened_by: {
          id: session.opener.id,
          name: session.opener.name,
        },
        closed_by: {
          id: closer.id,
          name: closer.name,
        },
      });
    }
  }

  private async backfillSales() {
    const sales = await this.prisma.sale.findMany({
      where: {
        status: SaleStatus.PAID,
      },
      include: historicalSaleInclude,
      orderBy: { createdAt: 'asc' },
    });

    for (const sale of sales) {
      await this.persistSaleCompleted(this.prisma, sale);
    }
  }

  private async backfillManualStockMovements() {
    const movements = await this.prisma.ingredientMovement.findMany({
      where: {
        OR: [
          { referenceType: IngredientMovementReferenceType.MANUAL },
          { referenceType: null },
        ],
      },
      include: historicalStockMovementInclude,
      orderBy: { createdAt: 'asc' },
    });

    for (const movement of movements) {
      await this.persistStockMovement(this.prisma, movement);
    }
  }

  private async computeHistoricalCashCloseSummary(
    session: HistoricalCashSessionRecord,
  ) {
    const payments = await this.prisma.payment.findMany({
      where: {
        sale: {
          cashSessionId: session.id,
          status: SaleStatus.PAID,
        },
      },
      select: {
        method: true,
        amountApplied: true,
        changeGiven: true,
      },
    });

    const cashSalesTotal = round(
      payments
        .filter((payment) => payment.method === 'CASH')
        .reduce((sum, payment) => sum + Number(payment.amountApplied), 0),
      2,
    );
    const transferSalesTotal = round(
      payments
        .filter((payment) => payment.method === 'TRANSFER')
        .reduce((sum, payment) => sum + Number(payment.amountApplied), 0),
      2,
    );
    const totalChangeGiven = round(
      payments.reduce((sum, payment) => sum + Number(payment.changeGiven), 0),
      2,
    );
    const closingCashExpected =
      session.closingCashExpected !== null
        ? round(Number(session.closingCashExpected), 2)
        : round(Number(session.openingCash) + cashSalesTotal, 2);
    const closingCashCounted =
      session.closingCashCounted !== null
        ? round(Number(session.closingCashCounted), 2)
        : closingCashExpected;

    return {
      cash_sales_total: cashSalesTotal,
      transfer_sales_total: transferSalesTotal,
      total_change_given: totalChangeGiven,
      closing_cash_expected: closingCashExpected,
      closing_cash_counted: closingCashCounted,
      difference: round(closingCashCounted - closingCashExpected, 2),
    };
  }

  private async persistSaleCompleted(
    client: PrismaClientLike,
    sale: HistoricalSaleRecord,
  ) {
    const items = await this.buildSaleLineItems(client, sale.items);
    const payment = sale.payments[0] ?? null;

    const summary: SaleCompletedActivitySummary = {
      sale_id: sale.id,
      created_at: sale.createdAt.toISOString(),
      total: Number(sale.total),
      status: sale.status,
      payment_method: payment?.method ?? null,
      responsible_name: sale.cashier.name,
      location_name: sale.location.name,
    };

    const detail: SaleCompletedActivityDetail = {
      ...summary,
      location_id: sale.location.id,
      cashier_id: sale.cashier.id,
      subtotal: Number(sale.subtotal),
      discount_type: sale.discountType,
      discount_value: Number(sale.discountValue),
      discount_amount: Number(sale.discountAmount),
      amount_received: payment ? Number(payment.amountReceived) : null,
      change_given: payment ? Number(payment.changeGiven) : null,
      items,
    };

    await this.upsertActivity(client, {
      event_key: this.buildEventKey(
        BusinessActivityType.SALE_COMPLETED,
        BusinessActivityEntityType.SALE,
        sale.id,
      ),
      activity_type: BusinessActivityType.SALE_COMPLETED,
      entity_type: BusinessActivityEntityType.SALE,
      entity_id: sale.id,
      occurred_at: sale.createdAt,
      actor: {
        user_id: sale.cashier.id,
        user_name: sale.cashier.name,
      },
      location: {
        location_id: sale.location.id,
        location_name: sale.location.name,
      },
      title: `Venta #${sale.id} confirmada`,
      subtitle: `${sale.location.name} · ${sale.cashier.name} · total ${Number(sale.total)}`,
      summary,
      detail,
    });
  }

  private async persistStockMovement(
    client: PrismaClientLike,
    movement: HistoricalStockMovementRecord,
  ) {
    const qtyDelta = this.resolveStockMovementDelta(movement);
    const summary: StockMovementActivitySummary = {
      movement_id: movement.id,
      ingredient_id: movement.ingredientId,
      ingredient_name: movement.ingredient.name,
      movement_type: movement.movementType,
      reason_code: movement.reasonCode,
      qty_delta: qtyDelta,
      location_name: movement.location.name,
      responsible_name: movement.adjustedByUser.name,
      created_at: movement.createdAt.toISOString(),
    };

    const detail: StockMovementActivityDetail = {
      ...summary,
      location_id: movement.location.id,
      responsible_id: movement.adjustedByUser.id,
      reference_type: movement.referenceType,
      reference_id: movement.referenceId,
      notes: movement.notes,
      support_document: movement.supportDocument,
      batch_number: movement.batchNumber,
      unit_cost_at_time:
        movement.unitCostAtTime === null ? null : Number(movement.unitCostAtTime),
      previous_stock:
        movement.previousStock === null ? null : Number(movement.previousStock),
      new_stock: movement.newStock === null ? null : Number(movement.newStock),
      counted_stock:
        movement.countedStock === null ? null : Number(movement.countedStock),
    };

    await this.upsertActivity(client, {
      event_key: this.buildEventKey(
        BusinessActivityType.STOCK_MOVEMENT,
        BusinessActivityEntityType.INGREDIENT_MOVEMENT,
        movement.id,
      ),
      activity_type: BusinessActivityType.STOCK_MOVEMENT,
      entity_type: BusinessActivityEntityType.INGREDIENT_MOVEMENT,
      entity_id: movement.id,
      occurred_at: movement.createdAt,
      actor: {
        user_id: movement.adjustedByUser.id,
        user_name: movement.adjustedByUser.name,
      },
      location: {
        location_id: movement.location.id,
        location_name: movement.location.name,
      },
      title: this.resolveStockMovementTitle(
        movement.movementType,
        movement.ingredient.name,
      ),
      subtitle: `${movement.location.name} · ${movement.adjustedByUser.name} · ${qtyDelta >= 0 ? '+' : ''}${qtyDelta}`,
      summary,
      detail,
    });
  }

  private async buildSaleLineItems(
    client: PrismaClientLike,
    items: HistoricalSaleRecord['items'],
  ): Promise<SaleCompletedActivityLineItem[]> {
    const variantIds = items
      .filter((item) => item.itemType === SaleItemType.VARIANT)
      .map((item) => item.refId);
    const comboIds = items
      .filter((item) => item.itemType === SaleItemType.COMBO)
      .map((item) => item.refId);

    const [variants, combos] = await Promise.all([
      client.productVariant.findMany({
        where: {
          id: {
            in: variantIds,
          },
        },
        include: {
          product: true,
        },
      }),
      client.combo.findMany({
        where: {
          id: {
            in: comboIds,
          },
        },
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
          ? this.formatVariantDescription(item.refId, variantById)
          : (comboById.get(item.refId)?.name ?? `Combo ${item.refId}`),
      qty: Number(item.qty),
      unit_price: Number(item.unitPrice),
      line_total: Number(item.lineTotal),
    }));
  }

  private formatVariantDescription(
    variantId: number,
    variants: Map<
      number,
      {
        product: {
          name: string;
        };
        size: string;
      }
    >,
  ) {
    const variant = variants.get(variantId);

    return variant
      ? [variant.product.name, variant.size].filter(Boolean).join(' ').trim()
      : `Variant ${variantId}`;
  }

  private async upsertActivity(
    client: PrismaClientLike,
    input: {
      event_key: string;
      activity_type: BusinessActivityType;
      entity_type: BusinessActivityEntityType;
      entity_id: number;
      occurred_at: Date;
      actor: ActivityActorReference | null;
      location: ActivityLocationReference | null;
      title: string;
      subtitle: string;
      summary: BusinessActivitySummaryPayload;
      detail: BusinessActivityDetailPayload;
    },
  ) {
    await client.businessActivity.upsert({
      where: {
        eventKey: input.event_key,
      },
      update: {
        type: input.activity_type,
        entityType: input.entity_type,
        entityId: input.entity_id,
        occurredAt: input.occurred_at,
        actorUserId: input.actor?.user_id ?? null,
        actorUserName: input.actor?.user_name ?? null,
        locationId: input.location?.location_id ?? null,
        locationName: input.location?.location_name ?? null,
        title: input.title,
        subtitle: input.subtitle,
        summaryJson: this.toJson(input.summary),
        detailJson: this.toJson(input.detail),
      },
      create: {
        eventKey: input.event_key,
        type: input.activity_type,
        entityType: input.entity_type,
        entityId: input.entity_id,
        occurredAt: input.occurred_at,
        actorUserId: input.actor?.user_id ?? null,
        actorUserName: input.actor?.user_name ?? null,
        locationId: input.location?.location_id ?? null,
        locationName: input.location?.location_name ?? null,
        title: input.title,
        subtitle: input.subtitle,
        summaryJson: this.toJson(input.summary),
        detailJson: this.toJson(input.detail),
      },
    });
  }

  private mapRecordToListItem(record: BusinessActivityRecord): BusinessActivityListItem {
    return {
      id: record.id,
      activity_type: record.type,
      entity_type: record.entityType,
      entity_id: record.entityId,
      occurred_at: record.occurredAt,
      title: record.title,
      subtitle: record.subtitle,
      actor: {
        user_id: record.actorUserId,
        user_name: record.actorUserName,
      },
      location: {
        location_id: record.locationId,
        location_name: record.locationName,
      },
      summary: this.parseJson<BusinessActivitySummaryPayload>(record.summaryJson),
      navigation: this.buildNavigation(record),
    };
  }

  private mapRecordToDetailItem(record: BusinessActivityRecord): BusinessActivityDetailItem {
    return {
      ...this.mapRecordToListItem(record),
      detail: this.parseJson<BusinessActivityDetailPayload>(record.detailJson),
    };
  }

  private buildFeedWhere(filters: {
    category?: 'ALL' | 'CASH' | 'SALES' | 'INVENTORY' | 'CONFIG';
    search?: string;
  }): Prisma.BusinessActivityWhereInput {
    const where: Prisma.BusinessActivityWhereInput = {};

    if (filters.category && filters.category !== 'ALL') {
      if (filters.category === 'CASH') {
        where.type = { in: [BusinessActivityType.CASH_OPENED, BusinessActivityType.CASH_CLOSED] };
      }

      if (filters.category === 'SALES') {
        where.type = BusinessActivityType.SALE_COMPLETED;
      }

      if (filters.category === 'INVENTORY') {
        where.type = BusinessActivityType.STOCK_MOVEMENT;
      }

      if (filters.category === 'CONFIG') {
        where.id = -1;
      }
    }

    const search = filters.search?.trim();

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { subtitle: { contains: search, mode: 'insensitive' } },
        { actorUserName: { contains: search, mode: 'insensitive' } },
        { locationName: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private buildNavigation(
    record: Pick<BusinessActivityRecord, 'type' | 'entityId' | 'locationId'>,
  ): BusinessActivityNavigationTarget | null {
    if (record.type === BusinessActivityType.SALE_COMPLETED) {
      return {
        label: 'Ver venta',
        path: '/sales',
        query: {
          saleId: String(record.entityId),
        },
      };
    }

    if (record.type === BusinessActivityType.STOCK_MOVEMENT) {
      return {
        label: 'Ver inventario',
        path: '/ingredients',
        query: {
          movementId: String(record.entityId),
          ...(record.locationId ? { locationId: String(record.locationId) } : {}),
        },
      };
    }

    if (
      record.type === BusinessActivityType.CASH_OPENED ||
      record.type === BusinessActivityType.CASH_CLOSED
    ) {
      return {
        label: 'Ir a caja',
        path: '/cash',
      };
    }

    return null;
  }

  private toLegacyActivityType(activityType: BusinessActivityType) {
    if (activityType === BusinessActivityType.SALE_COMPLETED) {
      return 'SALE' as const;
    }

    if (
      activityType === BusinessActivityType.CASH_OPENED ||
      activityType === BusinessActivityType.CASH_CLOSED
    ) {
      return 'CASH_SESSION' as const;
    }

    return 'STOCK_ADJUSTMENT' as const;
  }

  private toLegacyAction(
    activityType: BusinessActivityType,
    summary: BusinessActivitySummaryPayload,
  ) {
    if (activityType === BusinessActivityType.SALE_COMPLETED) {
      return 'SALE_PAID';
    }

    if (activityType === BusinessActivityType.CASH_OPENED) {
      return 'CASH_OPENED';
    }

    if (activityType === BusinessActivityType.CASH_CLOSED) {
      return 'CASH_CLOSED';
    }

    if (
      'movement_type' in summary &&
      summary.movement_type === IngredientMovementType.ENTRY
    ) {
      return 'STOCK_ENTRY_CREATED';
    }

    if (
      'movement_type' in summary &&
      summary.movement_type === IngredientMovementType.EXIT
    ) {
      return 'STOCK_EXIT_CREATED';
    }

    return 'STOCK_ADJUSTED';
  }

  private resolveStockMovementTitle(
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

  private resolveStockMovementDelta(
    movement: Pick<HistoricalStockMovementRecord, 'movementType' | 'qtyBase'>,
  ) {
    const qtyBase = Number(movement.qtyBase);

    if (movement.movementType === IngredientMovementType.ENTRY) {
      return round(qtyBase, 3);
    }

    if (movement.movementType === IngredientMovementType.EXIT) {
      return round(qtyBase * -1, 3);
    }

    return round(qtyBase, 3);
  }

  private buildEventKey(
    activityType: BusinessActivityType,
    entityType: BusinessActivityEntityType,
    entityId: number,
  ) {
    return `${activityType}:${entityType}:${entityId}`;
  }

  private toJson(
    value: BusinessActivitySummaryPayload | BusinessActivityDetailPayload | Record<string, number>,
  ): Prisma.InputJsonValue {
    return value as Prisma.InputJsonValue;
  }

  private parseJson<T>(value: Prisma.JsonValue) {
    return value as T;
  }
}
