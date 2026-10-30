'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, TOKEN_KEY } from '@/lib/api';
import type { Order, User } from '@/lib/types';

type AuthValue = {
  user: User | null;
  loading: boolean;
  /** سبد ۱۰ روزه باز کاربر (اگر داشته باشد) */
  hold: Order | null;
  setSession: (token: string, user: User) => void;
  logout: () => void;
  refresh: () => Promise<void>;
  refreshHold: () => Promise<void>;
};

const AuthContext = createContext<AuthValue>(null!);

const readToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hold, setHold] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshHold = useCallback(async () => {
    const token = readToken();
    if (!token) return setHold(null);
    setHold(await api<Order | null>('/orders/hold', { token }).catch(() => null));
  }, []);

  const refresh = useCallback(async () => {
    const token = readToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await api<User>('/auth/me', { token });
      setUser(me);
      if (me.role === 'USER') refreshHold();
    } catch (e: any) {
      if (e?.status === 401) {
        try { localStorage.removeItem(TOKEN_KEY); } catch {}
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, [refreshHold]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      loading,
      hold,
      refresh,
      refreshHold,
      setSession: (token, u) => {
        try { localStorage.setItem(TOKEN_KEY, token); } catch {}
        setUser(u);
        if (u.role === 'USER') refreshHold();
      },
      logout: () => {
        try { localStorage.removeItem(TOKEN_KEY); } catch {}
        setUser(null);
        setHold(null);
      },
    }),
    [user, loading, hold, refresh, refreshHold],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
