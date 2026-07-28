import { Injectable } from '@nestjs/common';
import { haversineMeters, type LatLng } from '@transitflow/simulation';
import type { TripLeg, TripPlan } from '@transitflow/types';
import { PrismaService } from './prisma.service';
import { SimulationService } from './simulation.service';

const AVG_WALK_KPH = 5;
const AVG_TRANSIT_KPH = 25;
const TRANSFER_BUFFER_SECONDS = 60;
const WALK_LEG_THRESHOLD_M = 30;
const NO_LIVE_DATA_WAIT_FALLBACK_SECONDS = 300;

/**
 * Simplified MVP trip planner: nearest-stop + direct-route-or-one-transfer
 * search. Good enough for a handful of routes; a real multi-city network
 * would need a proper transit routing algorithm (RAPTOR/Dijkstra over a
 * time-expanded graph) — noted as a Phase 2+ upgrade, not built prematurely.
 */
@Injectable()
export class PlanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sim: SimulationService,
  ) {}

  async plan(from: LatLng, to: LatLng): Promise<TripPlan[]> {
    const stops = await this.prisma.stop.findMany();
    const routes = await this.prisma.route.findMany({
      include: { stops: { orderBy: { sequence: 'asc' } }, vehicles: true },
    });

    if (stops.length === 0) return [];

    const nearestStop = (point: LatLng) => {
      let best: { stop: (typeof stops)[number]; distanceM: number } | null = null;
      for (const s of stops) {
        const distanceM = haversineMeters(point, s);
        if (!best || distanceM < best.distanceM) best = { stop: s, distanceM };
      }
      return best!;
    };

    const origin = nearestStop(from);
    const dest = nearestStop(to);

    const routesServing = (stopId: string) => routes.filter((r) => r.stops.some((rs) => rs.stopId === stopId));
    const originRoutes = routesServing(origin.stop.id);
    const destRoutes = routesServing(dest.stop.id);

    const walkLeg = (distanceM: number): TripLeg => ({
      mode: 'WALK',
      durationSeconds: Math.round(distanceM / ((AVG_WALK_KPH * 1000) / 3600)),
    });

    const minWaitSeconds = (route: (typeof routes)[number], stopId: string): number => {
      const rs = route.stops.find((r) => r.stopId === stopId);
      if (!rs) return Infinity;
      let min = Infinity;
      for (const v of route.vehicles) {
        const eta = this.sim.computeEtaSeconds(v.id, rs.distanceFromStartM);
        if (eta !== undefined && eta < min) min = eta;
      }
      return min === Infinity ? NO_LIVE_DATA_WAIT_FALLBACK_SECONDS : min;
    };

    const transitLeg = (
      route: (typeof routes)[number],
      fromStopId: string,
      toStopId: string,
      waitSeconds: number,
    ): TripLeg | null => {
      const fromRs = route.stops.find((rs) => rs.stopId === fromStopId);
      const toRs = route.stops.find((rs) => rs.stopId === toStopId);
      if (!fromRs || !toRs) return null;
      const distanceM = Math.abs(toRs.distanceFromStartM - fromRs.distanceFromStartM);
      const transitSeconds = Math.round(distanceM / ((AVG_TRANSIT_KPH * 1000) / 3600));
      return { mode: 'TRANSIT', routeId: route.id, fromStopId, toStopId, durationSeconds: waitSeconds + transitSeconds };
    };

    const plans: TripPlan[] = [];

    const directRoutes = originRoutes.filter((r) => destRoutes.some((dr) => dr.id === r.id));
    for (const route of directRoutes) {
      const leg = transitLeg(route, origin.stop.id, dest.stop.id, minWaitSeconds(route, origin.stop.id));
      if (!leg) continue;
      plans.push(this.buildPlan(origin.distanceM, dest.distanceM, [leg], walkLeg));
    }

    if (plans.length === 0) {
      for (const originRoute of originRoutes) {
        for (const destRoute of destRoutes) {
          if (originRoute.id === destRoute.id) continue;
          const transferStopId = originRoute.stops.find((rs) => destRoute.stops.some((drs) => drs.stopId === rs.stopId))?.stopId;
          if (!transferStopId) continue;

          const leg1 = transitLeg(originRoute, origin.stop.id, transferStopId, minWaitSeconds(originRoute, origin.stop.id));
          const leg2 = transitLeg(
            destRoute,
            transferStopId,
            dest.stop.id,
            minWaitSeconds(destRoute, transferStopId) + TRANSFER_BUFFER_SECONDS,
          );
          if (!leg1 || !leg2) continue;
          plans.push(this.buildPlan(origin.distanceM, dest.distanceM, [leg1, leg2], walkLeg));
        }
      }
    }

    return plans.sort((a, b) => a.totalDurationSeconds - b.totalDurationSeconds).slice(0, 3);
  }

  private buildPlan(originWalkM: number, destWalkM: number, transitLegs: TripLeg[], walkLeg: (m: number) => TripLeg): TripPlan {
    const legs: TripLeg[] = [];
    if (originWalkM > WALK_LEG_THRESHOLD_M) legs.push(walkLeg(originWalkM));
    legs.push(...transitLegs);
    if (destWalkM > WALK_LEG_THRESHOLD_M) legs.push(walkLeg(destWalkM));

    const totalDurationSeconds = legs.reduce((sum, l) => sum + l.durationSeconds, 0);
    const now = Date.now();
    return {
      legs,
      departAt: new Date(now).toISOString(),
      arriveAt: new Date(now + totalDurationSeconds * 1000).toISOString(),
      totalDurationSeconds,
      transfers: Math.max(0, transitLegs.length - 1),
    };
  }
}
