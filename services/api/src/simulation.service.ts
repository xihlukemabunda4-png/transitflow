import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SimulationEngine, haversineMeters, type LatLng, type SimRouteInput, type SimVehicleInput } from '@transitflow/simulation';
import type { VehiclePosition } from '@transitflow/types';
import { PrismaService } from './prisma.service';

interface RouteMeta {
  loop: boolean;
}

/**
 * Owns the in-memory SimulationEngine: loads routes/vehicles from the DB on
 * boot, starts the tick loop, caches latest positions for REST reads, and
 * fans out live updates to anything subscribed (the WebSocket gateway).
 *
 * This is the MVP stand-in for a real GPS feed — see docs/02-architecture.md
 * §4. Swapping to real hardware later means a `services/gps` adapter that
 * emits the same `VehiclePosition` shape; nothing downstream changes.
 */
@Injectable()
export class SimulationService implements OnModuleInit, OnModuleDestroy {
  private engine!: SimulationEngine;
  private routeMeta = new Map<string, RouteMeta>();
  private latest = new Map<string, VehiclePosition>();
  private listeners = new Set<(pos: VehiclePosition) => void>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
  }

  onModuleDestroy(): void {
    this.engine?.stop();
  }

  /**
   * Rebuilds the engine from current DB state. Called on boot and again by
   * the admin endpoints after any route/stop/vehicle mutation, so admin
   * changes take effect immediately instead of requiring a server restart.
   * Vehicles keep no position memory across a reload — acceptable for the
   * MVP's small demo fleet; a real fleet would want a smarter in-place diff.
   */
  async reload(): Promise<void> {
    this.engine?.stop();
    this.routeMeta.clear();
    this.latest.clear();

    const routes = await this.prisma.route.findMany();
    const vehicles = await this.prisma.vehicle.findMany();

    const simRoutes: SimRouteInput[] = routes.map((r) => {
      const points: LatLng[] = JSON.parse(r.polyline);
      const loop = haversineMeters(points[0], points[points.length - 1]) < 1;
      this.routeMeta.set(r.id, { loop });
      return { routeId: r.id, points, loop };
    });

    const vehiclesByRoute = new Map<string, typeof vehicles>();
    for (const v of vehicles) {
      if (!v.routeId) continue;
      const arr = vehiclesByRoute.get(v.routeId) ?? [];
      arr.push(v);
      vehiclesByRoute.set(v.routeId, arr);
    }

    const simVehicles: SimVehicleInput[] = [];
    for (const [routeId, vs] of vehiclesByRoute) {
      vs.forEach((v, i) => {
        simVehicles.push({ vehicleId: v.id, routeId, startFraction: i / vs.length });
      });
    }

    this.engine = new SimulationEngine(simRoutes, simVehicles, 1000);
    this.engine.on('vehicle:position', (pos: VehiclePosition) => {
      this.latest.set(pos.vehicleId, pos);
      for (const cb of this.listeners) cb(pos);
    });
    this.engine.start();
  }

  /** Returns an unsubscribe function. */
  onPosition(cb: (pos: VehiclePosition) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  getLatestPosition(vehicleId: string): VehiclePosition | undefined {
    return this.latest.get(vehicleId);
  }

  getVehicleRouteId(vehicleId: string): string | undefined {
    return this.engine.getVehicleState(vehicleId)?.routeId;
  }

  /**
   * Seconds until `vehicleId` reaches a stop `stopDistanceM` along its route,
   * accounting for loop wraparound or out-and-back direction reversal.
   */
  computeEtaSeconds(vehicleId: string, stopDistanceM: number): number | undefined {
    const state = this.engine.getVehicleState(vehicleId);
    if (!state) return undefined;
    const totalLength = this.engine.getRouteLength(state.routeId);
    const meta = this.routeMeta.get(state.routeId);
    if (totalLength === undefined || !meta) return undefined;

    const speedKph = this.latest.get(vehicleId)?.speedKph ?? 25;
    const speedMps = (speedKph * 1000) / 3600 || 1;

    let remainingM: number;
    if (meta.loop) {
      remainingM = (stopDistanceM - state.distanceM + totalLength) % totalLength;
    } else if (state.direction === 1) {
      remainingM =
        state.distanceM <= stopDistanceM
          ? stopDistanceM - state.distanceM
          : totalLength - state.distanceM + (totalLength - stopDistanceM);
    } else {
      remainingM = state.distanceM >= stopDistanceM ? state.distanceM - stopDistanceM : state.distanceM + stopDistanceM;
    }

    return Math.round(remainingM / speedMps);
  }
}
