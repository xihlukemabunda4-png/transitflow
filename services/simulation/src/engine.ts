import { EventEmitter } from 'events';
import type { OccupancyLevel, VehiclePosition } from '@transitflow/types';
import { cumulativeDistances, pointAlongPath, type LatLng } from './geo';

const OCCUPANCY_LEVELS: OccupancyLevel[] = ['EMPTY', 'AVAILABLE', 'LIMITED', 'STANDING_ONLY', 'FULL'];

export interface SimRouteInput {
  routeId: string;
  points: LatLng[];
  /** Loop routes wrap from end back to start; out-and-back routes reverse direction at each end. */
  loop: boolean;
}

export interface SimVehicleInput {
  vehicleId: string;
  routeId: string;
  /** 0..1 fraction of the route length to start at, so vehicles on the same route are spread out. */
  startFraction?: number;
  minSpeedKph?: number;
  maxSpeedKph?: number;
}

interface VehicleState {
  routeId: string;
  distanceM: number;
  direction: 1 | -1;
  speedKph: number;
  minSpeedKph: number;
  maxSpeedKph: number;
  occupancyIndex: number;
  ticksSinceOccupancyChange: number;
}

interface RouteState {
  points: LatLng[];
  cumDistances: number[];
  totalLength: number;
  loop: boolean;
}

/**
 * Generates realistic-looking vehicle movement along seeded routes. This is the
 * MVP stand-in for services/gps — it emits the same `vehicle:position` event
 * shape a real GPS feed adapter would, so downstream consumers (the API's
 * WebSocket gateway) don't know or care which one is running.
 */
export class SimulationEngine extends EventEmitter {
  private routes = new Map<string, RouteState>();
  private vehicles = new Map<string, VehicleState>();
  private timer: NodeJS.Timeout | null = null;

  constructor(
    routes: SimRouteInput[],
    vehicles: SimVehicleInput[],
    private readonly tickMs = 1000,
  ) {
    super();

    for (const r of routes) {
      const cumDistances = cumulativeDistances(r.points);
      this.routes.set(r.routeId, {
        points: r.points,
        cumDistances,
        totalLength: cumDistances[cumDistances.length - 1],
        loop: r.loop,
      });
    }

    for (const v of vehicles) {
      const route = this.routes.get(v.routeId);
      if (!route) continue;
      const minSpeedKph = v.minSpeedKph ?? 15;
      const maxSpeedKph = v.maxSpeedKph ?? 40;
      this.vehicles.set(v.vehicleId, {
        routeId: v.routeId,
        distanceM: (v.startFraction ?? 0) * route.totalLength,
        direction: 1,
        speedKph: (minSpeedKph + maxSpeedKph) / 2,
        minSpeedKph,
        maxSpeedKph,
        occupancyIndex: Math.floor(Math.random() * OCCUPANCY_LEVELS.length),
        ticksSinceOccupancyChange: 0,
      });
    }
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.tickMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Current in-memory state for a vehicle, used by REST reads (e.g. arrival ETAs). */
  getVehicleState(vehicleId: string): { routeId: string; distanceM: number; direction: 1 | -1 } | undefined {
    const v = this.vehicles.get(vehicleId);
    if (!v) return undefined;
    return { routeId: v.routeId, distanceM: v.distanceM, direction: v.direction };
  }

  getRouteLength(routeId: string): number | undefined {
    return this.routes.get(routeId)?.totalLength;
  }

  private tick(): void {
    for (const [vehicleId, v] of this.vehicles) {
      const route = this.routes.get(v.routeId);
      if (!route) continue;

      // Gentle random walk on speed so buses don't move at a robotic constant rate.
      const drift = (Math.random() - 0.5) * 6;
      v.speedKph = Math.max(v.minSpeedKph, Math.min(v.maxSpeedKph, v.speedKph + drift));

      const metersPerTick = (v.speedKph * 1000) / 3600 / (1000 / this.tickMs);
      v.distanceM += metersPerTick * v.direction;

      if (route.loop) {
        if (v.distanceM > route.totalLength) v.distanceM -= route.totalLength;
        if (v.distanceM < 0) v.distanceM += route.totalLength;
      } else {
        if (v.distanceM >= route.totalLength) {
          v.distanceM = route.totalLength;
          v.direction = -1;
        } else if (v.distanceM <= 0) {
          v.distanceM = 0;
          v.direction = 1;
        }
      }

      v.ticksSinceOccupancyChange++;
      if (v.ticksSinceOccupancyChange > 10 + Math.random() * 20) {
        const step = Math.random() < 0.5 ? -1 : 1;
        v.occupancyIndex = Math.max(0, Math.min(OCCUPANCY_LEVELS.length - 1, v.occupancyIndex + step));
        v.ticksSinceOccupancyChange = 0;
      }

      const pos = pointAlongPath(route.points, route.cumDistances, v.distanceM);
      const heading = v.direction === 1 ? pos.heading : (pos.heading + 180) % 360;

      const event: VehiclePosition = {
        vehicleId,
        lat: pos.lat,
        lng: pos.lng,
        heading,
        speedKph: Math.round(v.speedKph * 10) / 10,
        occupancy: OCCUPANCY_LEVELS[v.occupancyIndex],
        recordedAt: new Date().toISOString(),
      };

      this.emit('vehicle:position', event);
    }
  }
}
