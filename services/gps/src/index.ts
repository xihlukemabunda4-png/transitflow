import { EventEmitter } from 'events';
import type { VehiclePosition } from '@transitflow/types';

/**
 * The contract a real GPS feed adapter must satisfy to be a drop-in
 * replacement for `services/simulation`'s SimulationEngine — see
 * docs/02-architecture.md §4. `services/api`'s SimulationService only calls
 * `start()`/`stop()` and listens for `'vehicle:position'`; it never inspects
 * which implementation is running.
 *
 * A real implementation would connect to the operator's GPS hardware/telemetry
 * provider (e.g. an MQTT broker, a vendor's REST polling API, or a SIM-card
 * based tracker feed) and translate whatever wire format they send into this
 * same `VehiclePosition` event shape.
 */
export interface VehicleFeed {
  start(): void;
  stop(): void;
  on(event: 'vehicle:position', listener: (pos: VehiclePosition) => void): this;
}

/**
 * Placeholder adapter — emits nothing. Exists so `services/api` can be wired
 * to import `@transitflow/gps` instead of `@transitflow/simulation` the day
 * a real feed is available, without any other code changing. Replace the
 * body of `start()` with the real vendor integration when that day comes.
 */
export class NullVehicleFeed extends EventEmitter implements VehicleFeed {
  start(): void {
    // eslint-disable-next-line no-console
    console.warn('[NullVehicleFeed] No real GPS feed configured — this adapter emits no vehicle positions.');
  }

  stop(): void {}
}
