"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

interface User {
  id: number;
  email: string;
  name: string | null;
  avatar_url: string | null;
}

interface RegisterResult {
  needsVerification?: boolean;
  email?: string;
  error?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  loginWithGoogle: () => void;
  loginWithEmail: (email: string, password: string) => Promise<string | null>;
  registerWithEmail: (email: string, password: string, name?: string) => Promise<RegisterResult>;
  verifyEmail: (email: string, otp: string) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  loading: true,
  loginWithGoogle: () => {},
  loginWithEmail: async () => null,
  registerWithEmail: async () => ({}),
  verifyEmail: async () => null,
  loginWithEmail: async () => null,
  registerWithEmail: async () => null,
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

  const loginWithGoogle = useCallback(() => {
    window.location.href = `${API_BASE}/api/auth/google`;
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        return null; // success
      }
      return data.error || "Login failed";
    } catch {
      return "Network error. Please try again.";
    }
  }, []);

  const registerWithEmail = useCallback(async (email: string, password: string, name?: string): Promise<RegisterResult> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (res.ok) {
        // If OTP/verification is needed
        if (data.message && data.email) {
          return { needsVerification: true, email: data.email };
        }
        // Direct login (shouldn't happen with OTP, but handle gracefully)
        if (data.token) {
          setToken(data.token);
          return {};
        }
        return { error: "Unexpected response" };
      }
      return { error: data.error || "Registration failed" };
    } catch {
      return { error: "Network error. Please try again." };
    }
  }, []);

  const verifyEmail = useCallback(async (email: string, otp: string): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        return null; // success
      }
      return data.error || "Verification failed";
    } catch {
      return "Network error. Please try again.";
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("indieboost_token");
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, loginWithGoogle, loginWithEmail, registerWithEmail, verifyEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
