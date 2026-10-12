import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { tokenStore } from "@/api/client";
import { authService } from "@/services";
import type { AuthUser, Role } from "@/types/domain";

const USER_KEY = "imotion.user";

interface AuthContextValue {
  user: AuthUser | null;
  role: Role;
  ready: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  loginWithGoogle: (returnTo?: string) => Promise<AuthUser>;
  completeGoogleLogin: (token: string) => Promise<AuthUser>;
  register: (input: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
  }) => Promise<AuthUser>;
  logout: () => void;
  update: (patch: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStored(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(readStored());
    setReady(true);
  }, []);

  useEffect(() => {
    const handleInvalidAuth = () => {
      setUser(null);
      if (typeof window !== "undefined") window.localStorage.removeItem(USER_KEY);
    };
    window.addEventListener("imotion:auth-invalid", handleInvalidAuth);
    return () => window.removeEventListener("imotion:auth-invalid", handleInvalidAuth);
  }, []);

  const persist = useCallback((next: AuthUser | null, token?: string) => {
    setUser(next);
    if (typeof window === "undefined") return;
    if (next) {
      window.localStorage.setItem(USER_KEY, JSON.stringify(next));
      if (token) tokenStore.set(token);
    } else {
      window.localStorage.removeItem(USER_KEY);
      tokenStore.clear();
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? "VISITOR",
      ready,
      login: async (email, password) => {
        const session = await authService.login(email, password);
        persist(session.user, session.accessToken);
        return session.user;
      },
      loginWithGoogle: async (returnTo) => {
        const origin = typeof window !== "undefined" ? window.location.origin : "";
        const apiBase = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "";
        const backendUrl = apiBase || `${origin}`;
        const url = new URL(`${backendUrl}/auth/google`);
        if (returnTo) url.searchParams.set("returnTo", returnTo);
        window.location.assign(url.toString());
        return user ?? { id: "", firstName: "", lastName: "", email: "", phone: null, role: "VISITOR", createdAt: new Date().toISOString() };
      },
      completeGoogleLogin: async (token) => {
        const session = await authService.completeGoogleLogin(token);
        persist(session.user, session.accessToken);
        return session.user;
      },
      register: async (input) => {
        const session = await authService.register(input);
        persist(session.user, session.accessToken);
        return session.user;
      },
      logout: () => {
        authService.logout();
        persist(null);
      },
      update: (patch) => {
        setUser((prev) => {
          if (!prev) return prev;
          const next = { ...prev, ...patch };
          if (typeof window !== "undefined") window.localStorage.setItem(USER_KEY, JSON.stringify(next));
          return next;
        });
      },
    }),
    [user, ready, persist],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Home route for a given role, used after login and by role guards. */
export function homeForRole(role: Role): string {
  if (role === "ADMIN") return "/admin";
  if (role === "PARTICIPANT") return "/dashboard";
  return "/login";
}
