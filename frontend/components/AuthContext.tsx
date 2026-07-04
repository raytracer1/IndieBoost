"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

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
  loading: boolean;
  loginWithGoogle: () => void;
  loginWithEmail: (email: string, password: string) => Promise<string | null>;
  registerWithEmail: (email: string, password: string, name?: string) => Promise<RegisterResult>;
  verifyEmail: (email: string, otp: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  loginWithGoogle: () => {},
  loginWithEmail: async () => null,
  registerWithEmail: async () => ({}),
  verifyEmail: async () => null,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check auth state on mount via httpOnly cookie
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loginWithGoogle = useCallback(() => {
    window.location.href = "/api/auth/google";
  }, []);

  const loginWithEmail = useCallback(async (email: string, password: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        return null;
      }
      return data.error || "Login failed";
    } catch {
      return "Network error. Please try again.";
    }
  }, []);

  const registerWithEmail = useCallback(async (email: string, password: string, name?: string): Promise<RegisterResult> => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.message && data.email) {
          return { needsVerification: true, email: data.email };
        }
        return {};
      }
      return { error: data.error || "Registration failed" };
    } catch {
      return { error: "Network error. Please try again." };
    }
  }, []);

  const verifyEmail = useCallback(async (email: string, otp: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        return null;
      }
      return data.error || "Verification failed";
    } catch {
      return "Network error. Please try again.";
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithEmail, registerWithEmail, verifyEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
