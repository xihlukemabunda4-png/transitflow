'use client';

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import type { Route, ServiceAlert, Stop, StopArrival, TripPlan, VehiclePosition } from '@transitflow/types';
import { AuthPanel } from './AuthPanel';
import { SafetyPanel } from './SafetyPanel';
import { WalletPanel } from './WalletPanel';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { MAP_STYLE_URL } from '@/lib/config';
import { LANGUAGES, LANGUAGE_LABELS, type Language } from '@/lib/i18n/dictionaries';
import { useI18n } from '@/lib/i18n/context';
import { formatClock, formatDuration, formatEta, occupancyClass, occupancyLabel } from '@/lib/format';
import { getLiveSocket } from '@/lib/socket';
import { createVehicleMarkerEl, lerpHeading, type VehicleAnimState } from '@/lib/vehicleMarker';

const DEMO_CITY_CENTER: [number, number] = [28.047, -26.2001];

export function TransitExperience() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const vehicleAnimRef = useRef<Map<string, { marker: maplibregl.Marker; inner: HTMLDivElement } & VehicleAnimState>>(
    new Map(),
  );
  const vehicleColorRef = useRef<Map<string, string>>(new Map());
  const rafRef = useRef<number | null>(null);

  const [routes, setRoutes] = useState<Route[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [arrivals, setArrivals] = useState<StopArrival[]>([]);
  const [arrivalsLoading, setArrivalsLoading] = useState(false);

  const [viewMode, setViewMode] = useState<'stops' | 'plan' | 'routes' | 'wallet' | 'safety'>('stops');
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [planFromId, setPlanFromId] = useState('');
  const [planToId, setPlanToId] = useState('');
  const [plans, setPlans] = useState<TripPlan[] | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const { user, token, logout } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [favoriteRouteIds, setFavoriteRouteIds] = useState<Set<string>>(new Set());
  const [shareStatus, setShareStatus] = useState<Record<string, string>>({});

  async function shareTrip(vehicleId: string, destinationStopId: string) {
    if (!token) return;
    try {
      const share = await api.createTripShare(token, vehicleId, destinationStopId);
      const url = `${window.location.origin}/share/${share.id}`;
      await navigator.clipboard.writeText(url);
      setShareStatus((prev) => ({ ...prev, [vehicleId]: 'Link copied!' }));
    } catch {
      setShareStatus((prev) => ({ ...prev, [vehicleId]: 'Failed' }));
    } finally {
      setTimeout(() => setShareStatus((prev) => ({ ...prev, [vehicleId]: '' })), 3000);
    }
  }

  useEffect(() => {
    if (!token) {
      setFavoriteRouteIds(new Set());
      return;
    }
    api.favorites(token).then((favs) => setFavoriteRouteIds(new Set(favs.map((f) => f.routeId))));
  }, [token]);

  async function toggleFavorite(routeId: string) {
    if (!token) {
      setAuthPanelOpen(true);
      return;
    }
    const isFavorited = favoriteRouteIds.has(routeId);
    setFavoriteRouteIds((prev) => {
      const next = new Set(prev);
      isFavorited ? next.delete(routeId) : next.add(routeId);
      return next;
    });
    if (isFavorited) await api.removeFavorite(token, routeId);
    else await api.addFavorite(token, routeId);
  }

  // Fetch static data (routes/stops/vehicles) once, draw the map, and connect live tracking.
  useEffect(() => {
    let cancelled = false;

    async function setup() {
      const [routesData, stopsData, vehiclesData] = await Promise.all([api.routes(), api.stops(), api.vehicles()]);
      if (cancelled) return;

      setRoutes(routesData);
      setStops(stopsData);

      const routeById = new Map(routesData.map((r) => [r.id, r]));
      for (const v of vehiclesData) {
        if (!v.routeId) continue;
        const color = routeById.get(v.routeId)?.color ?? '#0EA36E';
        vehicleColorRef.current.set(v.id, color);
      }

      const map = new maplibregl.Map({
        container: mapContainerRef.current!,
        style: MAP_STYLE_URL,
        center: DEMO_CITY_CENTER,
        zoom: 13,
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl(), 'top-right');

      map.on('load', () => {
        for (const route of routesData) {
          const points: { lat: number; lng: number }[] = JSON.parse(route.polyline);
          map.addSource(`route-${route.id}`, {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: points.map((p) => [p.lng, p.lat]) },
            },
          });
          map.addLayer({
            id: `route-${route.id}`,
            type: 'line',
            source: `route-${route.id}`,
            paint: { 'line-color': route.color, 'line-width': 4, 'line-opacity': 0.85 },
          });
        }

        map.addSource('stops', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: stopsData.map((s) => ({
              type: 'Feature',
              properties: { id: s.id, name: s.name },
              geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
            })),
          },
        });
        map.addLayer({
          id: 'stops-circle',
          type: 'circle',
          source: 'stops',
          paint: {
            'circle-radius': 6,
            'circle-color': '#ffffff',
            'circle-stroke-width': 2,
            'circle-stroke-color': '#14181A',
          },
        });
        map.on('click', 'stops-circle', (e) => {
          const id = e.features?.[0]?.properties?.id;
          if (id) setSelectedStopId((prev) => (prev === id ? null : id));
        });
        map.on('mouseenter', 'stops-circle', () => (map.getCanvas().style.cursor = 'pointer'));
        map.on('mouseleave', 'stops-circle', () => (map.getCanvas().style.cursor = ''));
      });

      // Live vehicle tracking.
      const socket = getLiveSocket();
      for (const route of routesData) {
        socket.emit('subscribe', { routeId: route.id });
      }

      socket.on('service:alert', (alert: ServiceAlert) => {
        setAlerts((prev) => [alert, ...prev].slice(0, 5));
      });

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      socket.on('vehicle:position', (pos: VehiclePosition) => {
        const now = performance.now();
        const color = vehicleColorRef.current.get(pos.vehicleId) ?? '#0EA36E';
        const existing = vehicleAnimRef.current.get(pos.vehicleId);

        if (!existing) {
          const { root, inner } = createVehicleMarkerEl(color);
          const marker = new maplibregl.Marker({ element: root }).setLngLat([pos.lng, pos.lat]).addTo(map);
          vehicleAnimRef.current.set(pos.vehicleId, {
            marker,
            inner,
            color,
            from: { lat: pos.lat, lng: pos.lng, heading: pos.heading },
            to: { lat: pos.lat, lng: pos.lng, heading: pos.heading },
            fromTs: now,
            toTs: now,
          });
        } else {
          vehicleAnimRef.current.set(pos.vehicleId, {
            ...existing,
            from: existing.to,
            to: { lat: pos.lat, lng: pos.lng, heading: pos.heading },
            fromTs: now,
            toTs: reduceMotion ? now : now + 1000,
          });
        }
      });

      function animate() {
        const now = performance.now();
        for (const entry of vehicleAnimRef.current.values()) {
          const span = entry.toTs - entry.fromTs;
          const t = span > 0 ? Math.min(1, Math.max(0, (now - entry.fromTs) / span)) : 1;
          const lat = entry.from.lat + (entry.to.lat - entry.from.lat) * t;
          const lng = entry.from.lng + (entry.to.lng - entry.from.lng) * t;
          const heading = lerpHeading(entry.from.heading, entry.to.heading, t);
          entry.marker.setLngLat([lng, lat]);
          entry.inner.style.transform = `rotate(${heading}deg)`;
        }
        rafRef.current = requestAnimationFrame(animate);
      }
      rafRef.current = requestAnimationFrame(animate);
    }

    setup();

    // Captured once: the ref's `.current` Map is created via useRef and never
    // reassigned, so this stays valid for the lifetime of the effect.
    const vehicleAnimMap = vehicleAnimRef.current;

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const socket = getLiveSocket();
      socket.off('vehicle:position');
      socket.off('service:alert');
      for (const entry of vehicleAnimMap.values()) entry.marker.remove();
      vehicleAnimMap.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Live arrivals for the selected stop, refreshed every 5s.
  useEffect(() => {
    if (!selectedStopId) {
      setArrivals([]);
      return;
    }
    let cancelled = false;
    setArrivalsLoading(true);

    async function load() {
      try {
        const data = await api.arrivals(selectedStopId!);
        if (!cancelled) setArrivals(data);
      } finally {
        if (!cancelled) setArrivalsLoading(false);
      }
    }

    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedStopId]);

  const routeShortNameById = new Map(routes.map((r) => [r.id, r]));
  const stopById = new Map(stops.map((s) => [s.id, s]));

  async function submitPlan() {
    const fromStop = stopById.get(planFromId);
    const toStop = stopById.get(planToId);
    if (!fromStop || !toStop) {
      setPlanError('Pick both a "From" and "To" stop');
      return;
    }
    setPlanError(null);
    setPlanLoading(true);
    try {
      const result = await api.plan(fromStop, toStop);
      setPlans(result);
      if (result.length === 0) setPlanError('No route found between those stops');
    } catch {
      setPlanError('Trip planning failed — is the API running?');
    } finally {
      setPlanLoading(false);
    }
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <div ref={mapContainerRef} className="absolute inset-0" />

      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-tf-md bg-tf-surface-raised/95 backdrop-blur-md border border-tf-border px-3 py-2 shadow-lg text-sm">
        {user ? (
          <div className="flex items-center gap-2">
            <span className="text-tf-text">{user.displayName || user.email}</span>
            <button onClick={logout} className="text-tf-text-muted underline">
              {t('auth.signOut')}
            </button>
          </div>
        ) : (
          <button onClick={() => setAuthPanelOpen(true)} className="font-semibold text-tf-primary">
            {t('auth.signIn')}
          </button>
        )}
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          aria-label="Language"
          className="bg-transparent text-tf-text-muted text-xs border-l border-tf-border pl-2"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {LANGUAGE_LABELS[lang]}
            </option>
          ))}
        </select>
      </div>

      <AuthPanel open={authPanelOpen} onClose={() => setAuthPanelOpen(false)} />

      {alerts.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-sm space-y-2">
          {alerts.map((a, i) => {
            const route = routes.find((r) => r.id === a.routeId);
            return (
              <div
                key={i}
                className="rounded-tf-md bg-tf-danger text-white px-4 py-2 text-sm shadow-lg flex items-center justify-between gap-2"
              >
                <span>
                  {route ? `Route ${route.shortName}: ` : ''}
                  {a.message}
                </span>
                <button
                  onClick={() => setAlerts((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label="Dismiss"
                  className="shrink-0"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 max-h-[50%] overflow-y-auto rounded-t-tf-lg border-t border-tf-border bg-tf-surface/95 backdrop-blur-md shadow-2xl">
        <div className="flex justify-center pt-2 pb-1 sticky top-0 bg-tf-surface/95">
          <div className="w-10 h-1 rounded-full bg-tf-border" />
        </div>
        <div className="px-4 pb-6">
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setViewMode('stops')}
              className={`px-3 py-1.5 rounded-tf-sm text-sm font-semibold ${
                viewMode === 'stops' ? 'bg-tf-primary text-tf-primary-ink' : 'bg-tf-surface-raised text-tf-text-muted'
              }`}
            >
              {t('nav.stops')}
            </button>
            <button
              onClick={() => setViewMode('plan')}
              className={`px-3 py-1.5 rounded-tf-sm text-sm font-semibold ${
                viewMode === 'plan' ? 'bg-tf-primary text-tf-primary-ink' : 'bg-tf-surface-raised text-tf-text-muted'
              }`}
            >
              {t('nav.plan')}
            </button>
            <button
              onClick={() => setViewMode('routes')}
              className={`px-3 py-1.5 rounded-tf-sm text-sm font-semibold ${
                viewMode === 'routes' ? 'bg-tf-primary text-tf-primary-ink' : 'bg-tf-surface-raised text-tf-text-muted'
              }`}
            >
              {t('nav.routes')}
            </button>
            <button
              onClick={() => setViewMode('wallet')}
              className={`px-3 py-1.5 rounded-tf-sm text-sm font-semibold ${
                viewMode === 'wallet' ? 'bg-tf-primary text-tf-primary-ink' : 'bg-tf-surface-raised text-tf-text-muted'
              }`}
            >
              {t('nav.wallet')}
            </button>
            <button
              onClick={() => setViewMode('safety')}
              className={`px-3 py-1.5 rounded-tf-sm text-sm font-semibold ${
                viewMode === 'safety' ? 'bg-tf-primary text-tf-primary-ink' : 'bg-tf-surface-raised text-tf-text-muted'
              }`}
            >
              {t('nav.safety')}
            </button>
          </div>

          {viewMode === 'wallet' && <WalletPanel />}
          {viewMode === 'safety' && <SafetyPanel />}

          {viewMode === 'routes' && (
            <ul>
              {routes.map((route) => {
                const isFavorited = favoriteRouteIds.has(route.id);
                return (
                  <li key={route.id} className="border-b border-tf-border last:border-none">
                    <div className="w-full py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center justify-center rounded-tf-sm px-2 py-0.5 text-xs font-bold text-white"
                          style={{ background: route.color }}
                        >
                          {route.shortName}
                        </span>
                        <span className="text-tf-text">{route.longName}</span>
                      </div>
                      <button
                        onClick={() => toggleFavorite(route.id)}
                        aria-label={isFavorited ? 'Remove favorite' : 'Add favorite'}
                        className={isFavorited ? 'text-tf-warning' : 'text-tf-text-muted'}
                      >
                        {isFavorited ? '★' : '☆'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {viewMode === 'plan' && (
            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                <select
                  value={planFromId}
                  onChange={(e) => setPlanFromId(e.target.value)}
                  className="rounded-tf-sm border border-tf-border bg-tf-surface-raised px-3 py-2 text-sm text-tf-text"
                >
                  <option value="">{t('plan.from')}</option>
                  {stops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  value={planToId}
                  onChange={(e) => setPlanToId(e.target.value)}
                  className="rounded-tf-sm border border-tf-border bg-tf-surface-raised px-3 py-2 text-sm text-tf-text"
                >
                  <option value="">{t('plan.to')}</option>
                  {stops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={submitPlan}
                  disabled={planLoading}
                  className="rounded-tf-sm bg-tf-primary text-tf-primary-ink font-bold py-2 text-sm disabled:opacity-50"
                >
                  {planLoading ? 'Planning…' : t('common.go')}
                </button>
              </div>

              {planError && <p className="text-xs text-tf-danger">{planError}</p>}

              <div className="space-y-3">
                {plans?.map((plan, i) => (
                  <div key={i} className="rounded-tf-md border border-tf-border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold">
                        {formatClock(plan.departAt)} → {formatClock(plan.arriveAt)}
                      </span>
                      <span className="text-sm font-bold text-tf-primary">{formatDuration(plan.totalDurationSeconds)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {plan.legs.map((leg, li) => {
                        if (leg.mode === 'WALK') {
                          return (
                            <span key={li} className="text-xs text-tf-text-muted">
                              🚶 {formatDuration(leg.durationSeconds)}
                            </span>
                          );
                        }
                        const route = leg.routeId ? routeShortNameById.get(leg.routeId) : undefined;
                        return (
                          <span
                            key={li}
                            className="inline-flex items-center justify-center rounded-tf-sm px-2 py-0.5 text-xs font-bold text-white"
                            style={{ background: route?.color ?? '#0EA36E' }}
                          >
                            {route?.shortName ?? '?'}
                          </span>
                        );
                      })}
                    </div>
                    {plan.transfers > 0 && (
                      <p className="text-xs text-tf-text-muted mt-1">
                        {plan.transfers} transfer{plan.transfers > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'stops' && (
          <ul>
            {stops.map((stop) => (
              <li key={stop.id} className="border-b border-tf-border last:border-none">
                <button
                  onClick={() => setSelectedStopId((prev) => (prev === stop.id ? null : stop.id))}
                  className="w-full text-left py-3 flex items-center justify-between"
                >
                  <span className="text-tf-text">{stop.name}</span>
                  {stop.wheelchairAccessible && <span className="text-tf-text-muted text-xs">Accessible</span>}
                </button>
                {selectedStopId === stop.id && (
                  <div className="pb-3 space-y-2">
                    {arrivalsLoading && arrivals.length === 0 && (
                      <p className="text-xs text-tf-text-muted">Loading arrivals…</p>
                    )}
                    {!arrivalsLoading && arrivals.length === 0 && (
                      <p className="text-xs text-tf-text-muted">No upcoming arrivals</p>
                    )}
                    {arrivals.map((a) => {
                      const route = routeShortNameById.get(a.routeId);
                      return (
                        <div key={a.vehicleId} className="flex items-center gap-3 text-sm">
                          <span
                            className="inline-flex items-center justify-center rounded-tf-sm px-2 py-0.5 text-xs font-bold text-white"
                            style={{ background: route?.color ?? '#0EA36E' }}
                          >
                            {route?.shortName ?? '?'}
                          </span>
                          <span className="font-semibold tabular-nums w-14">{formatEta(a.etaSeconds)}</span>
                          <span className="text-xs text-tf-text-muted" title="Heuristic estimate, not a trained prediction">
                            {a.confidence}%
                          </span>
                          <span className={`text-xs ${occupancyClass(a.occupancy)}`}>{occupancyLabel(a.occupancy)}</span>
                          {token && (
                            <button
                              onClick={() => shareTrip(a.vehicleId, selectedStopId!)}
                              className="text-xs text-tf-primary font-semibold ml-auto"
                            >
                              {shareStatus[a.vehicleId] || 'Share'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </li>
            ))}
          </ul>
          )}
        </div>
      </div>
    </div>
  );
}
