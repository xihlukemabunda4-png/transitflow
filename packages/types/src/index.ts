export type OccupancyLevel =
  | 'EMPTY'
  | 'AVAILABLE'
  | 'LIMITED'
  | 'STANDING_ONLY'
  | 'FULL';

export type VehicleStatus = 'OFF_DUTY' | 'ON_ROUTE' | 'DELAYED' | 'OUT_OF_SERVICE';
export type VehicleSource = 'SIMULATED' | 'GPS_FEED';

export interface Route {
  id: string;
  shortName: string;
  longName: string;
  color: string;
  polyline: string;
  wheelchairAccessible: boolean;
}

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  wheelchairAccessible: boolean;
}

export interface Vehicle {
  id: string;
  label: string;
  routeId: string | null;
  capacitySeated: number;
  capacityStanding: number;
  wheelchairSpaces: number;
  bicycleSpaces: number;
  source: VehicleSource;
  status: VehicleStatus;
  mileageKm: number;
  lastServiceAt: string | null;
  nextServiceDueKm: number;
}

export interface VehiclePosition {
  vehicleId: string;
  lat: number;
  lng: number;
  heading: number;
  speedKph: number;
  occupancy: OccupancyLevel;
  recordedAt: string;
}

export interface StopArrival {
  routeId: string;
  vehicleId: string;
  etaSeconds: number;
  /**
   * 0-100 heuristic estimate of how much to trust `etaSeconds` — near-term
   * arrivals score higher, distant ones lower. NOT a machine-learning
   * prediction: no historical traffic/weather data pipeline exists yet
   * (see docs/09-roadmap.md Phase 3). A real confidence model needs that
   * data first.
   */
  confidence: number;
  occupancy: OccupancyLevel;
  wheelchairAccessible: boolean;
}

export interface HealthStatus {
  status: 'ok';
  service: string;
  timestamp: string;
}

export type TripLegMode = 'WALK' | 'TRANSIT';

export interface TripLeg {
  mode: TripLegMode;
  routeId?: string;
  fromStopId?: string;
  toStopId?: string;
  durationSeconds: number;
}

export interface TripPlan {
  legs: TripLeg[];
  departAt: string;
  arriveAt: string;
  totalDurationSeconds: number;
  transfers: number;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  role: 'RIDER' | 'DRIVER' | 'DISPATCHER' | 'ADMIN';
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export type PassType = 'SINGLE' | 'WEEKLY' | 'MONTHLY' | 'STUDENT' | 'SENIOR' | 'FAMILY';
export type TransactionType = 'TOP_UP' | 'TICKET_PURCHASE' | 'REFUND';
export type IncidentType = 'BREAKDOWN' | 'ACCIDENT' | 'DELAY' | 'ROAD_CLOSURE' | 'OTHER';

export interface WalletTransaction {
  id: string;
  amountCents: number;
  type: TransactionType;
  createdAt: string;
}

export interface Wallet {
  balanceCents: number;
  transactions: WalletTransaction[];
}

export interface Ticket {
  id: string;
  passType: PassType;
  qrToken: string;
  validFrom: string;
  validUntil: string;
  usedAt: string | null;
  createdAt: string;
}

export interface Shift {
  id: string;
  vehicleId: string;
  startedAt: string;
  endedAt: string | null;
}

export interface Incident {
  id: string;
  shiftId: string;
  type: IncidentType;
  description: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface FleetVehicle {
  id: string;
  label: string;
  routeId: string | null;
  status: VehicleStatus;
  position: VehiclePosition | null;
}

export interface ServiceAlert {
  routeId: string;
  message: string;
  createdAt: string;
}

export interface RewardsSummary {
  earnedPoints: number;
  redeemedPoints: number;
  availablePoints: number;
}

export interface RiderStats {
  totalRides: number;
  totalSpentCents: number;
  distanceKm: number;
  co2SavedKg: number;
  treesEquivalent: number;
  rewards: RewardsSummary;
}

export type LostFoundStatus = 'OPEN' | 'CLAIMED' | 'RESOLVED';

export interface LostFoundReport {
  id: string;
  description: string;
  routeId: string | null;
  status: LostFoundStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

export interface SosAlert {
  id: string;
  lat: number;
  lng: number;
  message: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface TripShareCreated {
  id: string;
  expiresAt: string;
}

export interface TripShareView {
  vehicleLabel: string;
  routeShortName: string | null;
  routeColor: string | null;
  position: VehiclePosition | null;
  destinationStopName: string | null;
  etaSeconds: number | null;
  expiresAt: string;
}

export interface AnalyticsSummary {
  totalRevenueCents: number;
  totalRides: number;
  activeRiders: number;
  ridesByDay: { date: string; count: number }[];
  revenueByDay: { date: string; cents: number }[];
}
