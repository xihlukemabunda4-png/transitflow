'use client';

import { useEffect, useState } from 'react';
import type { AnalyticsSummary, LostFoundReport, Route, Stop, Vehicle } from '@transitflow/types';
import { BarChart } from '@/components/BarChart';
import { api, type VehicleWithPosition } from '@/lib/api';
import { useAuth } from '@/lib/auth';

function formatCents(cents: number): string {
  return `R${(cents / 100).toFixed(2)}`;
}

export default function AdminPage() {
  const { user, token, login, logout, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [routes, setRoutes] = useState<Route[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [vehicles, setVehicles] = useState<VehicleWithPosition[]>([]);

  const [stopName, setStopName] = useState('');
  const [stopLat, setStopLat] = useState('');
  const [stopLng, setStopLng] = useState('');

  const [vehicleLabel, setVehicleLabel] = useState('');
  const [vehicleRouteId, setVehicleRouteId] = useState('');

  const [lostFound, setLostFound] = useState<LostFoundReport[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  async function refresh() {
    const [r, s, v] = await Promise.all([api.routes(), api.stops(), api.vehicles()]);
    setRoutes(r);
    setStops(s);
    setVehicles(v);
    if (token) {
      const [lf, a] = await Promise.all([api.admin.lostFound(token), api.admin.analytics(token)]);
      setLostFound(lf);
      setAnalytics(a);
    }
  }

  async function runAction(fn: () => Promise<unknown>, onSuccess?: () => void) {
    setActionError(null);
    try {
      await fn();
      onSuccess?.();
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed — is the API running?');
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading) return null;

  if (!isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-tf-bg text-tf-text px-6">
        <div className="w-80 rounded-tf-lg border border-tf-border bg-tf-surface-raised p-5">
          <h1 className="text-lg font-bold mb-1">TransitFlow Admin</h1>
          {user ? (
            <div className="space-y-2">
              <p className="text-sm text-tf-danger">Signed in as {user.email}, but this account isn&apos;t an admin.</p>
              <button onClick={logout} className="text-sm underline text-tf-text-muted">
                Sign out
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-tf-sm border border-tf-border bg-tf-surface px-3 py-2 text-sm"
              />
              <input
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-tf-sm border border-tf-border bg-tf-surface px-3 py-2 text-sm"
              />
              {loginError && <p className="text-xs text-tf-danger">{loginError}</p>}
              <button
                onClick={async () => {
                  setLoginError(null);
                  try {
                    await login(email, password);
                  } catch (err) {
                    setLoginError(err instanceof Error ? err.message : 'Login failed');
                  }
                }}
                className="w-full rounded-tf-sm bg-tf-primary text-tf-primary-ink font-bold py-2 text-sm"
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-tf-bg text-tf-text p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">TransitFlow Admin</h1>
        <button onClick={logout} className="text-sm underline text-tf-text-muted">
          Sign out
        </button>
      </div>

      {actionError && <p className="text-sm text-tf-danger mb-4">{actionError}</p>}

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-tf-text-muted mb-2">Routes</h2>
        <ul className="rounded-tf-md border border-tf-border divide-y divide-tf-border">
          {routes.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-3 py-2">
              <span className="flex items-center gap-2">
                <span className="rounded-tf-sm px-2 py-0.5 text-xs font-bold text-white" style={{ background: r.color }}>
                  {r.shortName}
                </span>
                {r.longName}
              </span>
              <button
                onClick={() => runAction(() => api.admin.deleteRoute(token!, r.id))}
                className="text-xs text-tf-danger"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-tf-text-muted mb-2">Stops</h2>
        <div className="flex gap-2 mb-3">
          <input
            placeholder="Name"
            value={stopName}
            onChange={(e) => setStopName(e.target.value)}
            className="flex-1 rounded-tf-sm border border-tf-border bg-tf-surface-raised px-3 py-2 text-sm"
          />
          <input
            placeholder="Lat"
            value={stopLat}
            onChange={(e) => setStopLat(e.target.value)}
            className="w-24 rounded-tf-sm border border-tf-border bg-tf-surface-raised px-3 py-2 text-sm"
          />
          <input
            placeholder="Lng"
            value={stopLng}
            onChange={(e) => setStopLng(e.target.value)}
            className="w-24 rounded-tf-sm border border-tf-border bg-tf-surface-raised px-3 py-2 text-sm"
          />
          <button
            onClick={() =>
              runAction(
                () => api.admin.createStop(token!, { name: stopName, lat: Number(stopLat), lng: Number(stopLng) }),
                () => {
                  setStopName('');
                  setStopLat('');
                  setStopLng('');
                },
              )
            }
            disabled={!stopName || !stopLat || !stopLng || Number.isNaN(Number(stopLat)) || Number.isNaN(Number(stopLng))}
            className="rounded-tf-sm bg-tf-primary text-tf-primary-ink font-bold px-3 text-sm disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <ul className="rounded-tf-md border border-tf-border divide-y divide-tf-border">
          {stops.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-3 py-2">
              <span>{s.name}</span>
              <button
                onClick={() => runAction(() => api.admin.deleteStop(token!, s.id))}
                className="text-xs text-tf-danger"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-tf-text-muted mb-2">Vehicles</h2>
        <div className="flex gap-2 mb-3">
          <input
            placeholder="Label (e.g. BUS-020A)"
            value={vehicleLabel}
            onChange={(e) => setVehicleLabel(e.target.value)}
            className="flex-1 rounded-tf-sm border border-tf-border bg-tf-surface-raised px-3 py-2 text-sm"
          />
          <select
            value={vehicleRouteId}
            onChange={(e) => setVehicleRouteId(e.target.value)}
            className="rounded-tf-sm border border-tf-border bg-tf-surface-raised px-3 py-2 text-sm"
          >
            <option value="">No route</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.shortName} — {r.longName}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              runAction(
                () => api.admin.createVehicle(token!, { label: vehicleLabel, routeId: vehicleRouteId || undefined }),
                () => {
                  setVehicleLabel('');
                  setVehicleRouteId('');
                },
              )
            }
            disabled={!vehicleLabel}
            className="rounded-tf-sm bg-tf-primary text-tf-primary-ink font-bold px-3 text-sm disabled:opacity-50"
          >
            Add
          </button>
        </div>
        <ul className="rounded-tf-md border border-tf-border divide-y divide-tf-border">
          {vehicles.map((v: Vehicle) => {
            const dueSoon = v.nextServiceDueKm - v.mileageKm < 1000;
            return (
            <li key={v.id} className="flex items-center justify-between px-3 py-2">
              <span>
                <div>
                  {v.label} · {routes.find((r) => r.id === v.routeId)?.shortName ?? 'unassigned'}
                </div>
                <div className={`text-xs ${dueSoon ? 'text-tf-warning' : 'text-tf-text-muted'}`}>
                  {v.mileageKm.toFixed(0)} km · service due at {v.nextServiceDueKm.toFixed(0)} km
                  {v.lastServiceAt && ` · last serviced ${new Date(v.lastServiceAt).toLocaleDateString()}`}
                </div>
              </span>
              <span className="flex items-center gap-2">
                <button
                  onClick={() => runAction(() => api.admin.logService(token!, v.id))}
                  className="text-xs text-tf-primary font-semibold"
                >
                  Log Service
                </button>
                <button
                  onClick={() => runAction(() => api.admin.deleteVehicle(token!, v.id))}
                  className="text-xs text-tf-danger"
                >
                  Delete
                </button>
              </span>
            </li>
            );
          })}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-tf-text-muted mb-2">Lost &amp; Found</h2>
        <ul className="rounded-tf-md border border-tf-border divide-y divide-tf-border">
          {lostFound.length === 0 && <li className="px-3 py-3 text-sm text-tf-text-muted">No reports</li>}
          {lostFound.map((r) => (
            <li key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>{r.description}</span>
              {r.status === 'RESOLVED' ? (
                <span className="text-xs text-tf-success">Resolved</span>
              ) : (
                <button
                  onClick={() => runAction(() => api.admin.resolveLostFound(token!, r.id))}
                  className="text-xs text-tf-primary font-semibold"
                >
                  Mark Resolved
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {analytics && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-tf-text-muted mb-2">Analytics (14 days)</h2>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-tf-sm border border-tf-border p-2 text-center">
              <div className="text-lg font-bold">{formatCents(analytics.totalRevenueCents)}</div>
              <div className="text-xs text-tf-text-muted">Total revenue</div>
            </div>
            <div className="rounded-tf-sm border border-tf-border p-2 text-center">
              <div className="text-lg font-bold">{analytics.totalRides}</div>
              <div className="text-xs text-tf-text-muted">Total rides</div>
            </div>
            <div className="rounded-tf-sm border border-tf-border p-2 text-center">
              <div className="text-lg font-bold">{analytics.activeRiders}</div>
              <div className="text-xs text-tf-text-muted">Active riders</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-tf-text-muted mb-1">Rides / day</p>
              <BarChart data={analytics.ridesByDay.map((d) => ({ label: d.date, value: d.count }))} />
            </div>
            <div>
              <p className="text-xs text-tf-text-muted mb-1">Revenue / day</p>
              <BarChart
                data={analytics.revenueByDay.map((d) => ({ label: d.date, value: d.cents }))}
                formatValue={formatCents}
              />
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
