'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AuthUser } from '@transitflow/types';
import { API_BASE_URL } from './config';

const TOKEN_STORAGE_KEY = 'transitflow.token';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function authRequest(path: string, body: unknown) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    // NestJS's ValidationPipe returns `message` as an array of field errors;
    // passing that straight to Error() renders them jammed together by commas.
    const message = Array.isArray(data?.message) ? data.message.join('. ') : data?.message;
    throw new Error(message || `Request failed (${res.status})`);
  }
  return res.json() as Promise<{ token: string; user: AuthUser }>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }
    fetch(`${API_BASE_URL}/me`, { headers: { Authorization: `Bearer ${stored}` } })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((u: AuthUser) => {
        setToken(stored);
        setUser(u);
      })
      .catch(() => window.localStorage.removeItem(TOKEN_STORAGE_KEY))
      .finally(() => setLoading(false));
  }, []);

  const applyAuth = useCallback((result: { token: string; user: AuthUser }) => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const signup = useCallback(
    async (email: string, password: string, displayName?: string) => {
      applyAuth(await authRequest('/auth/signup', { email, password, displayName }));
    },
    [applyAuth],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      applyAuth(await authRequest('/auth/login', { email, password }));
    },
    [applyAuth],
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, token, loading, signup, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
