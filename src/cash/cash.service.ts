import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, SaleStatus } from '@prisma/client';
import { BusinessActivityService } from '../business-activity/business-activity.service';
import { round } from '../common/utils/number.util';
import { PrismaService } from '../prisma/prisma.service';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { GetCurrentCashQueryDto } from './dto/get-current-cash-query.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';

interface CloseCashComputation {
  opening_cash: number;
  cash_sales_total: number;
  transfer_sales_total: number;
  total_change_given: number;
  closing_cash_expected: number;
  closing_cash_counted: number;
  difference: number;
}

@Injectable()
export class CashService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly businessActivityService: BusinessActivityService,
  ) {}

  async open(dto: OpenCashSessionDto) {
    const [location, user] = await Promise.all([
      this.prisma.location.findUnique({ where: { id: dto.location_id } }),
      this.prisma.user.findUnique({ where: { id: dto.opened_by } }),
    ]);
    if (!location) throw new NotFoundException('Location not found');
    if (!user) throw new NotFoundException('User not found');
    if (!location.isActive) {
      throw new BadRequestException('Location is inactive');
    }

    const active = await this.prisma.cashSession.findFirst({
      where: { locationId: dto.location_id, closedAt: null },
    });
    if (active) {
      throw new BadRequestException(
        `Location ${dto.location_id} already has an open cash session`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.cashSession.create({
        data: {
          locationId: dto.location_id,
          openedBy: dto.opened_by,
          openingCash: dto.opening_cash,
        },
      });

      await this.businessActivityService.recordCashOpened(tx, {
        cash_session_id: session.id,
        opened_at: session.openedAt,
        opening_cash: Number(session.openingCash),
        location: {
          id: location.id,
          name: location.name,
        },
        responsible: {
          id: user.id,
          name: user.name,
        },
      });

      return session;
    });
  }

  async close(dto: CloseCashSessionDto) {
    const [session, user] = await Promise.all([
      this.prisma.cashSession.findUnique({
        where: { id: dto.cash_session_id },
        include: {
          location: true,
          opener: true,
        },
      }),
      this.prisma.user.findUnique({ where: { id: dto.closed_by } }),
    ]);

    if (!session) throw new NotFoundException('Cash session not found');
    if (!user) throw new NotFoundException('User not found');
    if (session.closedAt) throw new BadRequestException('Cash session already closed');

    const summary = await this.computeCloseSummary(
      session.id,
      Number(session.openingCash),
      dto.closing_cash_counted,
    );

    return this.prisma.$transaction(async (tx) => {
      const closedAt = new Date();
      const updatedSession = await tx.cashSession.update({
        where: { id: session.id },
        data: {
          closedAt,
          closedById: dto.closed_by,
          closingCashExpected: summary.closing_cash_expected,
          closingCashCounted: summary.closing_cash_counted,
        },
      });

      await this.businessActivityService.recordCashClosed(tx, {
        cash_session_id: updatedSession.id,
        opened_at: session.openedAt,
        closed_at: closedAt,
        opening_cash: summary.opening_cash,
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
          id: user.id,
          name: user.name,
        },
      });

      return {
        cash_session_id: updatedSession.id,
        ...summary,
        closed_at: updatedSession.closedAt,
      };
    });
  }

  async getCurrent(query: GetCurrentCashQueryDto) {
    const location = await this.prisma.location.findUnique({
      where: { id: query.location_id },
    });
    if (!location) throw new NotFoundException('Location not found');

    const session = await this.prisma.cashSession.findFirst({
      where: {
        locationId: query.location_id,
        closedAt: null,
      },
      orderBy: { openedAt: 'desc' },
    });

    return {
      location,
      current_session: session,
    };
  }

  private async computeCloseSummary(
    sessionId: number,
    openingCash: number,
    closingCashCountedInput: number,
  ): Promise<CloseCashComputation> {
    const [cashPayments, transferPayments] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          method: PaymentMethod.CASH,
          sale: {
            cashSessionId: sessionId,
            status: SaleStatus.PAID,
          },
        },
      }),
      this.prisma.payment.findMany({
        where: {
          method: PaymentMethod.TRANSFER,
          sale: {
            cashSessionId: sessionId,
            status: SaleStatus.PAID,
          },
        },
      }),
    ]);

    const cashSalesTotal = round(
      cashPayments.reduce(
        (sum, payment) => sum + Number(payment.amountApplied),
        0,
      ),
      2,
    );
    const transferSalesTotal = round(
      transferPayments.reduce(
        (sum, payment) => sum + Number(payment.amountApplied),
        0,
      ),
      2,
    );
    const totalChangeGiven = round(
      cashPayments.reduce(
        (sum, payment) => sum + Number(payment.changeGiven),
        0,
      ),
      2,
    );
    const closingCashExpected = round(openingCash + cashSalesTotal, 2);
    const closingCashCounted = round(closingCashCountedInput, 2);
    const difference = round(closingCashCounted - closingCashExpected, 2);

    return {
      opening_cash: openingCash,
      cash_sales_total: cashSalesTotal,
      transfer_sales_total: transferSalesTotal,
      total_change_given: totalChangeGiven,
      closing_cash_expected: closingCashExpected,
      closing_cash_counted: closingCashCounted,
      difference,
    };
  }
}
