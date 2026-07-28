import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AuthUser } from '@transitflow/types';
import { api } from './api';

const TOKEN_KEY = 'transitflow.token';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY)
      .then((stored) => {
        if (stored) setToken(stored);
      })
      .finally(() => setLoading(false));
  }, []);

  const apply = useCallback(async (result: { token: string; user: AuthUser }) => {
    await AsyncStorage.setItem(TOKEN_KEY, result.token);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const login = useCallback(async (email: string, password: string) => apply(await api.login(email, password)), [apply]);
  const signup = useCallback(
    async (email: string, password: string, displayName?: string) => apply(await api.signup(email, password, displayName)),
    [apply],
  );
  const logout = useCallback(() => {
    AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
