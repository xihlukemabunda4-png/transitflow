import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { TripShareCreated, TripShareView } from '@transitflow/types';
import { CreateTripShareDto } from './dto';
import { JwtAuthGuard, type JwtPayload } from './jwt-auth.guard';
import { PrismaService } from './prisma.service';
import { SimulationService } from './simulation.service';

interface AuthedRequest {
  user: JwtPayload;
}

const DEFAULT_SHARE_HOURS = 2;
const MAX_SHARE_HOURS = 8;

@Controller()
export class TripShareController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sim: SimulationService,
  ) {}

  @Post('me/trip-shares')
  @UseGuards(JwtAuthGuard)
  async create(@Req() req: AuthedRequest, @Body() dto: CreateTripShareDto): Promise<TripShareCreated> {
    const hours = Math.min(dto.hours ?? DEFAULT_SHARE_HOURS, MAX_SHARE_HOURS);
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } });
    if (!vehicle) throw new BadRequestException('Vehicle not found');

    const share = await this.prisma.tripShare.create({
      data: {
        userId: req.user.sub,
        vehicleId: dto.vehicleId,
        destinationStopId: dto.destinationStopId,
        expiresAt: new Date(Date.now() + hours * 3600_000),
      },
    });
    return { id: share.id, expiresAt: share.expiresAt.toISOString() };
  }

  @Delete('me/trip-shares/:id')
  @UseGuards(JwtAuthGuard)
  async revoke(@Req() req: AuthedRequest, @Param('id') id: string) {
    await this.prisma.tripShare.deleteMany({ where: { id, userId: req.user.sub } });
    return { ok: true };
  }

  /** Public — no auth. Anyone holding the link can view the shared trip until it expires. */
  @Get('trip-shares/:id')
  async view(@Param('id') id: string): Promise<TripShareView> {
    const share = await this.prisma.tripShare.findUnique({
      where: { id },
      include: { user: false },
    });
    if (!share || share.expiresAt < new Date()) throw new NotFoundException('This shared trip is no longer available');

    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: share.vehicleId }, include: { route: true } });
    if (!vehicle) throw new NotFoundException('This shared trip is no longer available');

    let destinationStopName: string | null = null;
    let etaSeconds: number | null = null;
    if (share.destinationStopId) {
      const stop = await this.prisma.stop.findUnique({ where: { id: share.destinationStopId } });
      destinationStopName = stop?.name ?? null;
      if (stop && vehicle.routeId) {
        const routeStop = await this.prisma.routeStop.findUnique({
          where: { routeId_stopId: { routeId: vehicle.routeId, stopId: stop.id } },
        });
        if (routeStop) {
          etaSeconds = this.sim.computeEtaSeconds(vehicle.id, routeStop.distanceFromStartM) ?? null;
        }
      }
    }

    return {
      vehicleLabel: vehicle.label,
      routeShortName: vehicle.route?.shortName ?? null,
      routeColor: vehicle.route?.color ?? null,
      position: this.sim.getLatestPosition(vehicle.id) ?? null,
      destinationStopName,
      etaSeconds,
      expiresAt: share.expiresAt.toISOString(),
    };
  }
}
