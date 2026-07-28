import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import type { AnalyticsSummary, LostFoundReport } from '@transitflow/types';
import {
  CreateRouteDto,
  CreateStopDto,
  CreateVehicleDto,
  LogServiceDto,
  UpdateRouteDto,
  UpdateStopDto,
  UpdateVehicleDto,
} from './dto';
import { AdminGuard, JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from './prisma.service';
import { SimulationService } from './simulation.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const ANALYTICS_WINDOW_DAYS = 14;

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sim: SimulationService,
  ) {}

  @Post('routes')
  async createRoute(@Body() dto: CreateRouteDto) {
    const route = await this.prisma.route.create({ data: dto });
    await this.sim.reload();
    return route;
  }

  @Patch('routes/:id')
  async updateRoute(@Param('id') id: string, @Body() dto: UpdateRouteDto) {
    const route = await this.prisma.route.update({ where: { id }, data: dto });
    await this.sim.reload();
    return route;
  }

  @Delete('routes/:id')
  async deleteRoute(@Param('id') id: string) {
    await this.prisma.route.delete({ where: { id } });
    await this.sim.reload();
    return { ok: true };
  }

  @Post('stops')
  createStop(@Body() dto: CreateStopDto) {
    return this.prisma.stop.create({ data: dto });
  }

  @Patch('stops/:id')
  updateStop(@Param('id') id: string, @Body() dto: UpdateStopDto) {
    return this.prisma.stop.update({ where: { id }, data: dto });
  }

  @Delete('stops/:id')
  async deleteStop(@Param('id') id: string) {
    await this.prisma.stop.delete({ where: { id } });
    await this.sim.reload();
    return { ok: true };
  }

  @Post('vehicles')
  async createVehicle(@Body() dto: CreateVehicleDto) {
    const vehicle = await this.prisma.vehicle.create({ data: dto });
    await this.sim.reload();
    return vehicle;
  }

  @Patch('vehicles/:id')
  async updateVehicle(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    const vehicle = await this.prisma.vehicle.update({ where: { id }, data: dto });
    await this.sim.reload();
    return vehicle;
  }

  @Delete('vehicles/:id')
  async deleteVehicle(@Param('id') id: string) {
    await this.prisma.vehicle.delete({ where: { id } });
    await this.sim.reload();
    return { ok: true };
  }

  @Post('vehicles/:id/log-service')
  async logService(@Param('id') id: string, @Body() dto: LogServiceDto) {
    const vehicle = await this.prisma.vehicle.findUniqueOrThrow({ where: { id } });
    return this.prisma.vehicle.update({
      where: { id },
      data: {
        lastServiceAt: new Date(),
        nextServiceDueKm: dto.nextServiceDueKm ?? vehicle.mileageKm + 10000,
      },
    });
  }

  @Get('lost-found')
  async lostFound(): Promise<LostFoundReport[]> {
    const reports = await this.prisma.lostFoundReport.findMany({ orderBy: { createdAt: 'desc' } });
    return reports.map((r) => ({
      id: r.id,
      description: r.description,
      routeId: r.routeId,
      status: r.status as LostFoundReport['status'],
      createdAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
    }));
  }

  @Post('lost-found/:id/resolve')
  async resolveLostFound(@Param('id') id: string) {
    await this.prisma.lostFoundReport.update({ where: { id }, data: { status: 'RESOLVED', resolvedAt: new Date() } });
    return { ok: true };
  }

  @Get('analytics')
  async analytics(): Promise<AnalyticsSummary> {
    const since = new Date(Date.now() - ANALYTICS_WINDOW_DAYS * DAY_MS);

    const [revenue, ridesCount, riderIds, ticketsInWindow] = await Promise.all([
      this.prisma.transaction.aggregate({ where: { type: 'TICKET_PURCHASE' }, _sum: { amountCents: true } }),
      this.prisma.ticket.count({ where: { usedAt: { not: null } } }),
      this.prisma.wallet.findMany({ select: { userId: true } }),
      this.prisma.ticket.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    ]);

    const txInWindow = await this.prisma.transaction.findMany({
      where: { type: 'TICKET_PURCHASE', createdAt: { gte: since } },
      select: { createdAt: true, amountCents: true },
    });

    const ridesByDayMap = new Map<string, number>();
    for (const t of ticketsInWindow) {
      const key = dayKey(t.createdAt);
      ridesByDayMap.set(key, (ridesByDayMap.get(key) ?? 0) + 1);
    }
    const revenueByDayMap = new Map<string, number>();
    for (const t of txInWindow) {
      const key = dayKey(t.createdAt);
      revenueByDayMap.set(key, (revenueByDayMap.get(key) ?? 0) + Math.abs(t.amountCents));
    }

    const ridesByDay: AnalyticsSummary['ridesByDay'] = [];
    const revenueByDay: AnalyticsSummary['revenueByDay'] = [];
    for (let i = ANALYTICS_WINDOW_DAYS - 1; i >= 0; i--) {
      const date = dayKey(new Date(Date.now() - i * DAY_MS));
      ridesByDay.push({ date, count: ridesByDayMap.get(date) ?? 0 });
      revenueByDay.push({ date, cents: revenueByDayMap.get(date) ?? 0 });
    }

    return {
      totalRevenueCents: Math.abs(revenue._sum.amountCents ?? 0),
      totalRides: ridesCount,
      activeRiders: riderIds.length,
      ridesByDay,
      revenueByDay,
    };
  }
}
