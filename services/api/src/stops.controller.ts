import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import type { StopArrival } from '@transitflow/types';
import { PrismaService } from './prisma.service';
import { SimulationService } from './simulation.service';

const MIN_CONFIDENCE = 40;
const MAX_CONFIDENCE = 95;
const CONFIDENCE_DECAY_PER_MINUTE = 2.5;

/**
 * Rule-based estimate, not a trained model — see the `confidence` doc
 * comment on StopArrival in packages/types. Near-term arrivals are treated
 * as more trustworthy than distant ones; that's the entire heuristic.
 */
function estimateConfidence(etaSeconds: number): number {
  const etaMinutes = etaSeconds / 60;
  const confidence = MAX_CONFIDENCE - etaMinutes * CONFIDENCE_DECAY_PER_MINUTE;
  return Math.round(Math.min(MAX_CONFIDENCE, Math.max(MIN_CONFIDENCE, confidence)));
}

@Controller('stops')
export class StopsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sim: SimulationService,
  ) {}

  @Get()
  list() {
    return this.prisma.stop.findMany();
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const stop = await this.prisma.stop.findUnique({ where: { id } });
    if (!stop) throw new NotFoundException('Stop not found');
    return stop;
  }

  @Get(':id/arrivals')
  async arrivals(@Param('id') id: string): Promise<StopArrival[]> {
    const routeStops = await this.prisma.routeStop.findMany({
      where: { stopId: id },
      include: { route: { include: { vehicles: true } } },
    });
    if (routeStops.length === 0) {
      const stopExists = await this.prisma.stop.findUnique({ where: { id } });
      if (!stopExists) throw new NotFoundException('Stop not found');
    }

    const arrivals: StopArrival[] = [];
    for (const rs of routeStops) {
      for (const vehicle of rs.route.vehicles) {
        const etaSeconds = this.sim.computeEtaSeconds(vehicle.id, rs.distanceFromStartM);
        if (etaSeconds === undefined) continue;
        const pos = this.sim.getLatestPosition(vehicle.id);
        arrivals.push({
          routeId: rs.routeId,
          vehicleId: vehicle.id,
          etaSeconds,
          confidence: estimateConfidence(etaSeconds),
          occupancy: pos?.occupancy ?? 'AVAILABLE',
          wheelchairAccessible: rs.route.wheelchairAccessible,
        });
      }
    }

    return arrivals.sort((a, b) => a.etaSeconds - b.etaSeconds);
  }
}
