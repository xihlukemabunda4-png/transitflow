import type {
  AnalyticsSummary,
  EmergencyContact,
  FleetVehicle,
  Incident,
  IncidentType,
  LostFoundReport,
  PassType,
  RiderStats,
  Route,
  Shift,
  SosAlert,
  Stop,
  StopArrival,
  Ticket,
  TripPlan,
  TripShareCreated,
  TripShareView,
  Vehicle,
  VehiclePosition,
  Wallet,
} from '@transitflow/types';
import { API_BASE_URL } from './config';

export interface RouteDetail extends Route {
  stops: { sequence: number; distanceFromStartM: number; stop: Stop }[];
}

export interface VehicleWithPosition extends Vehicle {
  position: VehiclePosition | null;
}

async function apiErrorMessage(res: Response, path: string): Promise<string> {
  try {
    const data = await res.json();
    const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    return message || `${path} failed: ${res.status}`;
  } catch {
    return `${path} failed: ${res.status}`;
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) throw new Error(await apiErrorMessage(res, path));
  return res.json();
}

async function authedRequest<T>(path: string, method: string, token: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res, path));
  return res.json();
}

export const api = {
  routes: () => get<Route[]>('/routes'),
  route: (id: string) => get<RouteDetail>(`/routes/${id}`),
  stops: () => get<Stop[]>('/stops'),
  arrivals: (stopId: string) => get<StopArrival[]>(`/stops/${stopId}/arrivals`),
  vehicles: () => get<VehicleWithPosition[]>('/vehicles'),
  plan: (from: { lat: number; lng: number }, to: { lat: number; lng: number }) =>
    get<TripPlan[]>(`/plan?from=${from.lat},${from.lng}&to=${to.lat},${to.lng}`),
  favorites: (token: string) => authedRequest<{ routeId: string }[]>('/me/favorites', 'GET', token),
  addFavorite: (token: string, routeId: string) => authedRequest('/me/favorites', 'POST', token, { routeId }),
  removeFavorite: (token: string, routeId: string) => authedRequest(`/me/favorites/${routeId}`, 'DELETE', token),
  wallet: (token: string) => authedRequest<Wallet>('/wallet', 'GET', token),
  topUp: (token: string, amountCents: number) => authedRequest<Wallet>('/wallet/topup', 'POST', token, { amountCents }),
  myTickets: (token: string) => authedRequest<Ticket[]>('/tickets', 'GET', token),
  buyTicket: (token: string, passType: PassType) => authedRequest<Ticket>('/tickets', 'POST', token, { passType }),
  validateTicket: (token: string, ticketId: string) =>
    authedRequest<{ ok: true }>(`/tickets/${ticketId}/validate`, 'POST', token),
  stats: (token: string) => authedRequest<RiderStats>('/me/stats', 'GET', token),
  redeemPoints: (token: string, points: number) => authedRequest<RiderStats>('/me/rewards/redeem', 'POST', token, { points }),
  emergencyContacts: (token: string) => authedRequest<EmergencyContact[]>('/me/emergency-contacts', 'GET', token),
  addEmergencyContact: (token: string, name: string, phone: string) =>
    authedRequest<EmergencyContact>('/me/emergency-contacts', 'POST', token, { name, phone }),
  removeEmergencyContact: (token: string, id: string) =>
    authedRequest(`/me/emergency-contacts/${id}`, 'DELETE', token),
  triggerSos: (token: string, lat: number, lng: number, message?: string) =>
    authedRequest<SosAlert>('/me/sos', 'POST', token, { lat, lng, message }),
  myLostFound: (token: string) => authedRequest<LostFoundReport[]>('/me/lost-found', 'GET', token),
  reportLostItem: (token: string, description: string, routeId?: string) =>
    authedRequest<LostFoundReport>('/me/lost-found', 'POST', token, { description, routeId }),
  createTripShare: (token: string, vehicleId: string, destinationStopId?: string, hours?: number) =>
    authedRequest<TripShareCreated>('/me/trip-shares', 'POST', token, { vehicleId, destinationStopId, hours }),
  viewTripShare: (id: string) => get<TripShareView>(`/trip-shares/${id}`),
  driver: {
    startShift: (token: string, vehicleId: string) =>
      authedRequest<Shift>('/driver/shifts/start', 'POST', token, { vehicleId }),
    endShift: (token: string) => authedRequest<{ ok: true }>('/driver/shifts/end', 'POST', token),
    reportIncident: (token: string, type: IncidentType, description?: string) =>
      authedRequest<Incident>('/driver/shifts/current/incidents', 'POST', token, { type, description }),
  },
  dispatch: {
    fleet: (token: string) => authedRequest<FleetVehicle[]>('/dispatch/fleet', 'GET', token),
    incidents: (token: string, openOnly: boolean) =>
      authedRequest<Incident[]>(`/dispatch/incidents?open=${openOnly}`, 'GET', token),
    resolveIncident: (token: string, id: string) =>
      authedRequest<{ ok: true }>(`/dispatch/incidents/${id}/resolve`, 'POST', token),
    broadcastAlert: (token: string, routeId: string, message: string) =>
      authedRequest('/dispatch/alerts', 'POST', token, { routeId, message }),
    sos: (token: string, openOnly: boolean) => authedRequest<SosAlert[]>(`/dispatch/sos?open=${openOnly}`, 'GET', token),
    resolveSos: (token: string, id: string) => authedRequest<{ ok: true }>(`/dispatch/sos/${id}/resolve`, 'POST', token),
  },
  admin: {
    createStop: (token: string, data: { name: string; lat: number; lng: number }) =>
      authedRequest<Stop>('/admin/stops', 'POST', token, data),
    deleteStop: (token: string, id: string) => authedRequest(`/admin/stops/${id}`, 'DELETE', token),
    createVehicle: (token: string, data: { label: string; routeId?: string }) =>
      authedRequest<Vehicle>('/admin/vehicles', 'POST', token, data),
    deleteVehicle: (token: string, id: string) => authedRequest(`/admin/vehicles/${id}`, 'DELETE', token),
    deleteRoute: (token: string, id: string) => authedRequest(`/admin/routes/${id}`, 'DELETE', token),
    logService: (token: string, vehicleId: string) =>
      authedRequest<Vehicle>(`/admin/vehicles/${vehicleId}/log-service`, 'POST', token, {}),
    lostFound: (token: string) => authedRequest<LostFoundReport[]>('/admin/lost-found', 'GET', token),
    resolveLostFound: (token: string, id: string) =>
      authedRequest<{ ok: true }>(`/admin/lost-found/${id}/resolve`, 'POST', token),
    analytics: (token: string) => authedRequest<AnalyticsSummary>('/admin/analytics', 'GET', token),
  },
};
