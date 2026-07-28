import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { AuthUser, EmergencyContact, LostFoundReport, RiderStats, SosAlert } from '@transitflow/types';
import { AccessibilityDto, EmergencyContactDto, FavoriteDto, LostFoundReportDto, RedeemPointsDto, SosAlertDto } from './dto';
import { JwtAuthGuard, type JwtPayload } from './jwt-auth.guard';
import { PrismaService } from './prisma.service';

interface AuthedRequest {
  user: JwtPayload;
}

// Demo-scale constants for stats derived from data we actually have (no real
// telemetry/trip-distance tracking exists yet) — see docs/09-roadmap.md.
const POINTS_PER_RIDE = 10;
const AVG_TRIP_KM = 8;
const CO2_SAVED_PER_KM_KG = 0.12;
const KG_CO2_PER_TREE_PER_YEAR = 21;
const POINTS_TO_CENTS_RATE = 5; // 1 point = 5 cents
const MIN_REDEEM_POINTS = 100;

@Controller('me')
@UseGuards(JwtAuthGuard)
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async me(@Req() req: AuthedRequest): Promise<AuthUser> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: req.user.sub } });
    return { id: user.id, email: user.email, displayName: user.displayName, role: user.role as AuthUser['role'] };
  }

  @Patch('accessibility')
  updateAccessibility(@Req() req: AuthedRequest, @Body() dto: AccessibilityDto) {
    return this.prisma.accessibilityPrefs.upsert({
      where: { userId: req.user.sub },
      create: { userId: req.user.sub, ...dto },
      update: dto,
    });
  }

  @Get('favorites')
  favorites(@Req() req: AuthedRequest) {
    return this.prisma.favoriteRoute.findMany({ where: { userId: req.user.sub } });
  }

  @Post('favorites')
  addFavorite(@Req() req: AuthedRequest, @Body() dto: FavoriteDto) {
    return this.prisma.favoriteRoute.upsert({
      where: { userId_routeId: { userId: req.user.sub, routeId: dto.routeId } },
      create: { userId: req.user.sub, routeId: dto.routeId },
      update: {},
    });
  }

  @Delete('favorites/:routeId')
  async removeFavorite(@Req() req: AuthedRequest, @Param('routeId') routeId: string) {
    await this.prisma.favoriteRoute.deleteMany({ where: { userId: req.user.sub, routeId } });
    return { ok: true };
  }

  @Get('stats')
  async stats(@Req() req: AuthedRequest): Promise<RiderStats> {
    const userId = req.user.sub;
    const [totalRides, redemptions] = await Promise.all([
      this.prisma.ticket.count({ where: { userId, usedAt: { not: null } } }),
      this.prisma.rewardRedemption.aggregate({ where: { userId }, _sum: { pointsRedeemed: true } }),
    ]);

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    let totalSpentCents = 0;
    if (wallet) {
      const spend = await this.prisma.transaction.aggregate({
        where: { walletId: wallet.id, type: 'TICKET_PURCHASE' },
        _sum: { amountCents: true },
      });
      totalSpentCents = Math.abs(spend._sum.amountCents ?? 0);
    }

    const distanceKm = totalRides * AVG_TRIP_KM;
    const co2SavedKg = distanceKm * CO2_SAVED_PER_KM_KG;
    const earnedPoints = totalRides * POINTS_PER_RIDE;
    const redeemedPoints = redemptions._sum.pointsRedeemed ?? 0;

    return {
      totalRides,
      totalSpentCents,
      distanceKm,
      co2SavedKg,
      treesEquivalent: co2SavedKg / KG_CO2_PER_TREE_PER_YEAR,
      rewards: { earnedPoints, redeemedPoints, availablePoints: earnedPoints - redeemedPoints },
    };
  }

  @Post('rewards/redeem')
  async redeemPoints(@Req() req: AuthedRequest, @Body() dto: RedeemPointsDto) {
    if (dto.points < MIN_REDEEM_POINTS) {
      throw new BadRequestException(`Minimum redemption is ${MIN_REDEEM_POINTS} points`);
    }
    const currentStats = await this.stats(req);
    if (dto.points > currentStats.rewards.availablePoints) {
      throw new BadRequestException('Not enough points');
    }

    const creditedCents = dto.points * POINTS_TO_CENTS_RATE;
    const wallet = await this.prisma.wallet.upsert({
      where: { userId: req.user.sub },
      create: { userId: req.user.sub },
      update: {},
    });

    await this.prisma.$transaction([
      this.prisma.rewardRedemption.create({
        data: { userId: req.user.sub, pointsRedeemed: dto.points, creditedCents },
      }),
      this.prisma.wallet.update({ where: { id: wallet.id }, data: { balanceCents: { increment: creditedCents } } }),
      this.prisma.transaction.create({ data: { walletId: wallet.id, amountCents: creditedCents, type: 'TOP_UP' } }),
    ]);

    return this.stats(req);
  }

  @Get('emergency-contacts')
  async emergencyContacts(@Req() req: AuthedRequest): Promise<EmergencyContact[]> {
    return this.prisma.emergencyContact.findMany({ where: { userId: req.user.sub } });
  }

  @Post('emergency-contacts')
  addEmergencyContact(@Req() req: AuthedRequest, @Body() dto: EmergencyContactDto): Promise<EmergencyContact> {
    return this.prisma.emergencyContact.create({ data: { userId: req.user.sub, ...dto } });
  }

  @Delete('emergency-contacts/:id')
  async removeEmergencyContact(@Req() req: AuthedRequest, @Param('id') id: string) {
    await this.prisma.emergencyContact.deleteMany({ where: { id, userId: req.user.sub } });
    return { ok: true };
  }

  @Post('sos')
  async triggerSos(@Req() req: AuthedRequest, @Body() dto: SosAlertDto): Promise<SosAlert> {
    const alert = await this.prisma.sosAlert.create({
      data: { userId: req.user.sub, lat: dto.lat, lng: dto.lng, message: dto.message },
    });
    return { ...alert, resolvedAt: null, createdAt: alert.createdAt.toISOString() };
  }

  @Get('lost-found')
  async myLostFoundReports(@Req() req: AuthedRequest): Promise<LostFoundReport[]> {
    const reports = await this.prisma.lostFoundReport.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: 'desc' },
    });
    return reports.map((r) => ({
      id: r.id,
      description: r.description,
      routeId: r.routeId,
      status: r.status as LostFoundReport['status'],
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
    }));
  }

  @Post('lost-found')
  async reportLostItem(@Req() req: AuthedRequest, @Body() dto: LostFoundReportDto): Promise<LostFoundReport> {
    const r = await this.prisma.lostFoundReport.create({
      data: { userId: req.user.sub, description: dto.description, routeId: dto.routeId },
    });
    return { id: r.id, description: r.description, routeId: r.routeId, status: r.status as LostFoundReport['status'], createdAt: r.createdAt.toISOString(), resolvedAt: null };
  }
}
