import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const STORAGE_KEY = "lb_token";

export interface AuthUser {
  id: number;
  telegramId: string;
  telegramName: string | null;
  telegramUsername: string | null;
  plan: string;
  expiresAt: string | null;
  isAdmin?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  token: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const applyToken = useCallback((t: string | null) => {
    setToken(t);
    if (t) {
      localStorage.setItem(STORAGE_KEY, t);
      setAuthTokenGetter(() => t);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setAuthTokenGetter(null);
    }
  }, []);

  const validateToken = useCallback(async (t: string): Promise<AuthUser | null> => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) return null;
      return await res.json() as AuthUser;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setIsLoading(false);
      return;
    }
    applyToken(stored);
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000));
    Promise.race([validateToken(stored), timeout]).then((u) => {
      if (u) {
        setUser(u);
      } else {
        applyToken(null);
      }
      setIsLoading(false);
    }).catch(() => {
      applyToken(null);
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (password: string) => {
    const trimmed = password.trim().toUpperCase();
    if (!trimmed) return { success: false, error: "Password tidak boleh kosong" };

    const validUser = await validateToken(trimmed);
    if (!validUser) {
      return { success: false, error: "Password salah atau langganan sudah habis" };
    }

    applyToken(trimmed);
    setUser(validUser);
    return { success: true };
  }, [applyToken, validateToken]);

  const logout = useCallback(() => {
    applyToken(null);
    setUser(null);
  }, [applyToken]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout, token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
