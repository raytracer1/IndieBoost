"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

interface User {
  id: number;
  email: string;
  name: string | null;
  avatar_url: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load token from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("indieboost_token");
    if (stored) {
      setToken(stored);
    }
    setLoading(false);
  }, []);

  // Validate token and fetch user info when token changes
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }
    localStorage.setItem("indieboost_token", token);

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
          setToken(null);
          localStorage.removeItem("indieboost_token");
        }
      })
      .catch(() => {
        setToken(null);
        localStorage.removeItem("indieboost_token");
      });
  }, [token]);

  const login = useCallback(() => {
    window.location.href = `${API_BASE}/api/auth/google`;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("indieboost_token");
  }, []);

  // Expose setToken for the callback page
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>).__indieboost_setToken = setToken;
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
