'use client';

import { useEffect, useState } from 'react';
import type { IncidentType, Vehicle } from '@transitflow/types';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const INCIDENT_TYPES: IncidentType[] = ['DELAY', 'BREAKDOWN', 'ACCIDENT', 'ROAD_CLOSURE', 'OTHER'];

export default function DriverPage() {
  const { user, token, login, logout, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [onShift, setOnShift] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  useEffect(() => {
    api.vehicles().then(setVehicles);
  }, []);

  if (loading) return null;

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-tf-bg text-tf-text px-6">
        <div className="w-80 rounded-tf-lg border border-tf-border bg-tf-surface-raised p-5">
          <h1 className="text-lg font-bold mb-3">Driver Sign In</h1>
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

  return (
    <main className="min-h-screen bg-tf-bg text-tf-text p-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Driver</h1>
        <button onClick={logout} className="text-sm underline text-tf-text-muted">
          Sign out
        </button>
      </div>

      {!onShift ? (
        <div className="space-y-3">
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="w-full rounded-tf-sm border border-tf-border bg-tf-surface-raised px-3 py-3 text-base"
          >
            <option value="">Select vehicle…</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
          <button
            disabled={!selectedVehicleId}
            onClick={async () => {
              setStatusMsg(null);
              try {
                await api.driver.startShift(token!, selectedVehicleId);
                setOnShift(true);
              } catch (err) {
                setStatusMsg(err instanceof Error ? err.message : 'Failed to start shift');
              }
            }}
            className="w-full rounded-tf-md bg-tf-primary text-tf-primary-ink font-bold py-4 text-lg disabled:opacity-50"
          >
            Start Shift
          </button>
          {statusMsg && <p className="text-sm text-tf-danger">{statusMsg}</p>}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-tf-md bg-tf-success/10 border border-tf-success text-tf-success px-4 py-3 text-center font-semibold">
            On route — broadcasting GPS
          </div>

          <button
            onClick={async () => {
              await api.driver.endShift(token!);
              setOnShift(false);
              setSelectedVehicleId('');
            }}
            className="w-full rounded-tf-md bg-tf-danger text-white font-bold py-4 text-lg"
          >
            End Shift
          </button>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-tf-text-muted mb-2">Report Incident</h2>
            <input
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-tf-sm border border-tf-border bg-tf-surface-raised px-3 py-2 text-sm mb-2"
            />
            <div className="grid grid-cols-2 gap-2">
              {INCIDENT_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={async () => {
                    await api.driver.reportIncident(token!, type, description || undefined);
                    setStatusMsg(`Reported: ${type}`);
                    setDescription('');
                  }}
                  className="rounded-tf-sm border border-tf-border py-3 text-sm font-semibold"
                >
                  {type}
                </button>
              ))}
            </div>
            {statusMsg && <p className="text-sm text-tf-text-muted mt-2">{statusMsg}</p>}
          </div>
        </div>
      )}
    </main>
  );
}
