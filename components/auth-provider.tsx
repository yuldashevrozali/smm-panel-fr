"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { AuthResponse, User } from "@/types/api";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (response: AuthResponse) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const TOKEN_KEY = "smmly_access_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setToken(null);
  }, []);

  useEffect(() => {
    const savedToken = sessionStorage.getItem(TOKEN_KEY);
    if (!savedToken) { queueMicrotask(() => setLoading(false)); return; }
    api.me(savedToken).then((currentUser) => {
      setToken(savedToken);
      setUser(currentUser);
    }).catch((error: unknown) => {
      if (error instanceof ApiError && error.status !== 401) console.error("Could not restore session", error);
      sessionStorage.removeItem(TOKEN_KEY);
    }).finally(() => setLoading(false));
  }, []);

  const login = useCallback((response: AuthResponse) => {
    sessionStorage.setItem(TOKEN_KEY, response.access_token);
    setToken(response.access_token);
    setUser(response.user);
  }, []);

  const value = useMemo(() => ({ user, token, loading, login, logout }), [user, token, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
