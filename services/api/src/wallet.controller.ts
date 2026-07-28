import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import * as crypto from 'crypto';
import type { Ticket, Wallet } from '@transitflow/types';
import { PurchaseTicketDto, TopUpDto } from './dto';
import { JwtAuthGuard, type JwtPayload } from './jwt-auth.guard';
import { MockPaymentProvider } from './payment.service';
import { PrismaService } from './prisma.service';

interface AuthedRequest {
  user: JwtPayload;
}

const PASS_PRICE_CENTS: Record<string, number> = {
  SINGLE: 2000,
  WEEKLY: 8000,
  MONTHLY: 25000,
  STUDENT: 1200,
  SENIOR: 1200,
  FAMILY: 5000,
};

const PASS_VALIDITY_HOURS: Record<string, number> = {
  SINGLE: 2,
  WEEKLY: 24 * 7,
  MONTHLY: 24 * 30,
  STUDENT: 24 * 30,
  SENIOR: 24 * 30,
  FAMILY: 24,
};

async function getOrCreateWallet(prisma: PrismaService, userId: string) {
  const existing = await prisma.wallet.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.wallet.create({ data: { userId } });
}

@Controller()
@UseGuards(JwtAuthGuard)
export class WalletController {
  private readonly payments = new MockPaymentProvider();

  constructor(private readonly prisma: PrismaService) {}

  @Get('wallet')
  async wallet(@Req() req: AuthedRequest): Promise<Wallet> {
    const wallet = await getOrCreateWallet(this.prisma, req.user.sub);
    const transactions = await this.prisma.transaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return {
      balanceCents: wallet.balanceCents,
      transactions: transactions.map((t) => ({
        id: t.id,
        amountCents: t.amountCents,
        type: t.type as Wallet['transactions'][number]['type'],
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }

  @Post('wallet/topup')
  async topup(@Req() req: AuthedRequest, @Body() dto: TopUpDto): Promise<Wallet> {
    const charge = await this.payments.charge(dto.amountCents);
    if (!charge.success) throw new BadRequestException('Payment failed');

    const wallet = await getOrCreateWallet(this.prisma, req.user.sub);
    await this.prisma.$transaction([
      this.prisma.wallet.update({ where: { id: wallet.id }, data: { balanceCents: { increment: dto.amountCents } } }),
      this.prisma.transaction.create({ data: { walletId: wallet.id, amountCents: dto.amountCents, type: 'TOP_UP' } }),
    ]);
    return this.wallet(req);
  }

  @Post('tickets')
  async purchase(@Req() req: AuthedRequest, @Body() dto: PurchaseTicketDto): Promise<Ticket> {
    const priceCents = PASS_PRICE_CENTS[dto.passType];
    const wallet = await getOrCreateWallet(this.prisma, req.user.sub);
    if (wallet.balanceCents < priceCents) throw new BadRequestException('Insufficient wallet balance');

    const now = new Date();
    const validUntil = new Date(now.getTime() + PASS_VALIDITY_HOURS[dto.passType] * 3600_000);
    const qrToken = crypto.randomBytes(24).toString('hex');

    const [, , ticket] = await this.prisma.$transaction([
      this.prisma.wallet.update({ where: { id: wallet.id }, data: { balanceCents: { decrement: priceCents } } }),
      this.prisma.transaction.create({ data: { walletId: wallet.id, amountCents: -priceCents, type: 'TICKET_PURCHASE' } }),
      this.prisma.ticket.create({
        data: { userId: req.user.sub, passType: dto.passType, qrToken, validFrom: now, validUntil },
      }),
    ]);

    return this.toTicketDto(ticket);
  }

  @Get('tickets')
  async myTickets(@Req() req: AuthedRequest): Promise<Ticket[]> {
    const tickets = await this.prisma.ticket.findMany({ where: { userId: req.user.sub }, orderBy: { createdAt: 'desc' } });
    return tickets.map((t) => this.toTicketDto(t));
  }

  @Post('tickets/:id/validate')
  async validate(@Param('id') id: string) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.usedAt) throw new BadRequestException('Ticket already used');
    if (ticket.validUntil < new Date()) throw new BadRequestException('Ticket expired');

    // Atomic single-use guard: only succeeds if usedAt is still null at write time.
    const result = await this.prisma.ticket.updateMany({
      where: { id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (result.count === 0) throw new BadRequestException('Ticket already used');
    return { ok: true };
  }

  private toTicketDto(t: {
    id: string;
    passType: string;
    qrToken: string;
    validFrom: Date;
    validUntil: Date;
    usedAt: Date | null;
    createdAt: Date;
  }): Ticket {
    return {
      id: t.id,
      passType: t.passType as Ticket['passType'],
      qrToken: t.qrToken,
      validFrom: t.validFrom.toISOString(),
      validUntil: t.validUntil.toISOString(),
      usedAt: t.usedAt ? t.usedAt.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
    };
  }
}
