'use client';

import { useEffect, useState } from 'react';
import type { FleetVehicle, Incident, Route, SosAlert } from '@transitflow/types';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { occupancyClass, occupancyLabel } from '@/lib/format';

export default function DispatchPage() {
  const { user, token, login, logout, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [sosAlerts, setSosAlerts] = useState<SosAlert[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [alertRouteId, setAlertRouteId] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertSent, setAlertSent] = useState(false);

  async function refresh() {
    if (!token) return;
    const [f, i, s, r] = await Promise.all([
      api.dispatch.fleet(token),
      api.dispatch.incidents(token, true),
      api.dispatch.sos(token, true),
      api.routes(),
    ]);
    setFleet(f);
    setIncidents(i);
    setSosAlerts(s);
    setRoutes(r);
  }

  useEffect(() => {
    if (!token) return;
    refresh();
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading) return null;

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-tf-bg text-tf-text px-6">
        <div className="w-80 rounded-tf-lg border border-tf-border bg-tf-surface-raised p-5">
          <h1 className="text-lg font-bold mb-3">Dispatcher Sign In</h1>
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
        </div>
      </main>
    );
  }

  const routeById = new Map(routes.map((r) => [r.id, r]));

  return (
    <main className="min-h-screen bg-tf-bg text-tf-text p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Dispatch</h1>
        <button onClick={logout} className="text-sm underline text-tf-text-muted">
          Sign out
        </button>
      </div>

      {sosAlerts.length > 0 && (
        <div className="mb-6 rounded-tf-md border border-tf-danger bg-tf-danger/10 p-3">
          <h2 className="text-sm font-bold text-tf-danger mb-2">SOS Alerts</h2>
          <ul className="space-y-1">
            {sosAlerts.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm">
                <span>
                  {s.message ?? 'No message'} — ({s.lat.toFixed(4)}, {s.lng.toFixed(4)})
                </span>
                <button
                  onClick={async () => {
                    await api.dispatch.resolveSos(token!, s.id);
                    refresh();
                  }}
                  className="text-xs text-tf-primary font-semibold"
                >
                  Resolve
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-tf-text-muted mb-2">Fleet</h2>
          <ul className="rounded-tf-md border border-tf-border divide-y divide-tf-border">
            {fleet.map((v) => {
              const route = v.routeId ? routeById.get(v.routeId) : undefined;
              return (
                <li key={v.id} className="px-3 py-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    {route && (
                      <span
                        className="rounded-tf-sm px-1.5 py-0.5 text-xs font-bold text-white"
                        style={{ background: route.color }}
                      >
                        {route.shortName}
                      </span>
                    )}
                    {v.label}
                  </span>
                  <span className="flex items-center gap-3">
                    {v.position && (
                      <span className={`text-xs ${occupancyClass(v.position.occupancy)}`}>
                        {occupancyLabel(v.position.occupancy)}
                      </span>
                    )}
                    <span
                      className={
                        v.status === 'ON_ROUTE'
                          ? 'text-tf-success'
                          : v.status === 'DELAYED'
                            ? 'text-tf-warning'
                            : 'text-tf-text-muted'
                      }
                    >
                      {v.status}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-tf-text-muted mb-2">Open Incidents</h2>
          <ul className="rounded-tf-md border border-tf-border divide-y divide-tf-border mb-6">
            {incidents.length === 0 && <li className="px-3 py-3 text-sm text-tf-text-muted">No open incidents</li>}
            {incidents.map((inc) => (
              <li key={inc.id} className="px-3 py-2 flex items-center justify-between text-sm">
                <span>
                  <span className="font-semibold">{inc.type}</span>
                  {inc.description && <span className="text-tf-text-muted"> — {inc.description}</span>}
                </span>
                <button
                  onClick={async () => {
                    await api.dispatch.resolveIncident(token!, inc.id);
                    refresh();
                  }}
                  className="text-xs text-tf-primary font-semibold"
                >
                  Resolve
                </button>
              </li>
            ))}
          </ul>

          <h2 className="text-sm font-semibold uppercase tracking-wide text-tf-text-muted mb-2">Broadcast Alert</h2>
          <div className="space-y-2">
            <select
              value={alertRouteId}
              onChange={(e) => setAlertRouteId(e.target.value)}
              className="w-full rounded-tf-sm border border-tf-border bg-tf-surface-raised px-3 py-2 text-sm"
            >
              <option value="">Select route…</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.shortName} — {r.longName}
                </option>
              ))}
            </select>
            <input
              placeholder="Message (e.g. delayed due to traffic)"
              value={alertMessage}
              onChange={(e) => setAlertMessage(e.target.value)}
              className="w-full rounded-tf-sm border border-tf-border bg-tf-surface-raised px-3 py-2 text-sm"
            />
            <button
              disabled={!alertRouteId || !alertMessage}
              onClick={async () => {
                await api.dispatch.broadcastAlert(token!, alertRouteId, alertMessage);
                setAlertMessage('');
                setAlertSent(true);
                setTimeout(() => setAlertSent(false), 2000);
              }}
              className="w-full rounded-tf-sm bg-tf-danger text-white font-bold py-2 text-sm disabled:opacity-50"
            >
              {alertSent ? 'Sent!' : 'Broadcast to riders'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
