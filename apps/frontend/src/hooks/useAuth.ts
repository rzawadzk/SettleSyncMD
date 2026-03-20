import { createContext, useContext, useState, useCallback } from 'react';
import type { ArbiterProfile } from '@settlesync/shared';

interface AuthState {
  token: string | null;
  arbiter: ArbiterProfile | null;
  login: (token: string, arbiter: ArbiterProfile) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuthState(): AuthState {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('settlesync_token'));
  const [arbiter, setArbiter] = useState<ArbiterProfile | null>(() => {
    const stored = localStorage.getItem('settlesync_arbiter');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback((newToken: string, newArbiter: ArbiterProfile) => {
    localStorage.setItem('settlesync_token', newToken);
    localStorage.setItem('settlesync_arbiter', JSON.stringify(newArbiter));
    setToken(newToken);
    setArbiter(newArbiter);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('settlesync_token');
    localStorage.removeItem('settlesync_arbiter');
    setToken(null);
    setArbiter(null);
  }, []);

  return { token, arbiter, login, logout, isAuthenticated: !!token };
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
