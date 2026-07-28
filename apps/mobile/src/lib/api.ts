import type { AuthResponse, Route, Stop, StopArrival, Wallet } from '@transitflow/types';
import { API_BASE_URL } from './config';

async function apiErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.message || `Request failed: ${res.status}`;
  } catch {
    return `Request failed: ${res.status}`;
  }
}

async function get<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json();
}

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await apiErrorMessage(res));
  return res.json();
}

export const api = {
  login: (email: string, password: string) => post<AuthResponse>('/auth/login', { email, password }),
  signup: (email: string, password: string, displayName?: string) =>
    post<AuthResponse>('/auth/signup', { email, password, displayName }),
  routes: () => get<Route[]>('/routes'),
  stops: () => get<Stop[]>('/stops'),
  arrivals: (stopId: string) => get<StopArrival[]>(`/stops/${stopId}/arrivals`),
  wallet: (token: string) => get<Wallet>('/wallet', token),
  topUp: (token: string, amountCents: number) => post<Wallet>('/wallet/topup', { amountCents }, token),
};
