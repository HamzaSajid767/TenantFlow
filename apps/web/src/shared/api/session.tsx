import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiFetch, getAccessToken, setAccessToken } from './client';
import type { User } from './types';

type SessionState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const refreshed = await apiFetch<{ accessToken: string; user: User }>('/auth/refresh', {
          method: 'POST',
        });
        setAccessToken(refreshed.accessToken);
        setUser(refreshed.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo<SessionState>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const result = await apiFetch<{ accessToken: string; user: User }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setAccessToken(result.accessToken);
        setUser(result.user);
      },
      register: async (name, email, password) => {
        const result = await apiFetch<{ accessToken: string; user: User }>('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        });
        setAccessToken(result.accessToken);
        setUser(result.user);
      },
      logout: async () => {
        if (getAccessToken()) {
          await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
        }
        setAccessToken(null);
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return ctx;
}
