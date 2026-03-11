import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, SaleStatus } from '@prisma/client';
import { round } from '../common/utils/number.util';
import { PrismaService } from '../prisma/prisma.service';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { GetCurrentCashQueryDto } from './dto/get-current-cash-query.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';

@Injectable()
export class CashService {
  constructor(private readonly prisma: PrismaService) {}

  async open(dto: OpenCashSessionDto) {
    const [location, user] = await Promise.all([
      this.prisma.location.findUnique({ where: { id: dto.location_id } }),
      this.prisma.user.findUnique({ where: { id: dto.opened_by } }),
    ]);
    if (!location) throw new NotFoundException('Location not found');
    if (!user) throw new NotFoundException('User not found');

    const active = await this.prisma.cashSession.findFirst({
      where: { locationId: dto.location_id, closedAt: null },
    });
    if (active) {
      throw new BadRequestException(
        `Location ${dto.location_id} already has an open cash session`,
      );
    }

    return this.prisma.cashSession.create({
      data: {
        locationId: dto.location_id,
        openedBy: dto.opened_by,
        openingCash: dto.opening_cash,
      },
    });
  }

  async close(dto: CloseCashSessionDto) {
    const [session, user] = await Promise.all([
      this.prisma.cashSession.findUnique({
        where: { id: dto.cash_session_id },
      }),
      this.prisma.user.findUnique({ where: { id: dto.closed_by } }),
    ]);

    if (!session) throw new NotFoundException('Cash session not found');
    if (!user) throw new NotFoundException('User not found');
    if (session.closedAt) throw new BadRequestException('Cash session already closed');

    const [cashPayments, transferPayments] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          method: PaymentMethod.CASH,
          sale: {
            cashSessionId: session.id,
            status: SaleStatus.PAID,
          },
        },
      }),
      this.prisma.payment.findMany({
        where: {
          method: PaymentMethod.TRANSFER,
          sale: {
            cashSessionId: session.id,
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
    const openingCash = Number(session.openingCash);
    const closingCashExpected = round(openingCash + cashSalesTotal, 2);
    const closingCashCounted = round(dto.closing_cash_counted, 2);
    const difference = round(closingCashCounted - closingCashExpected, 2);

    const updatedSession = await this.prisma.cashSession.update({
      where: { id: session.id },
      data: {
        closedAt: new Date(),
        closingCashExpected,
        closingCashCounted,
      },
    });

    return {
      cash_session_id: updatedSession.id,
      opening_cash: openingCash,
      cash_sales_total: cashSalesTotal,
      transfer_sales_total: transferSalesTotal,
      total_change_given: totalChangeGiven,
      closing_cash_expected: closingCashExpected,
      closing_cash_counted: closingCashCounted,
      difference,
      closed_at: updatedSession.closedAt,
    };
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
}
