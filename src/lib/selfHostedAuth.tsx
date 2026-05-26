"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AuthUser = {
  subject: string;
  email: string;
  name: string;
  pictureUrl?: string;
};

type AuthContextValue = {
  isLoading: boolean;
  token: string | null;
  user: AuthUser | null;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signUp: (input: { email: string; name: string; password: string }) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "lawn.auth.token";
const authBaseUrl = import.meta.env.VITE_CONVEX_SITE_URL;

function decodePayload(token: string) {
  const [, payload] = token.split(".");
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    return JSON.parse(json) as {
      sub?: string;
      email?: string;
      name?: string;
      pictureUrl?: string;
      exp?: number;
    };
  } catch {
    return null;
  }
}

function userFromToken(token: string): AuthUser | null {
  const payload = decodePayload(token);
  if (!payload?.sub || !payload.email || !payload.name) return null;
  if (payload.exp && payload.exp * 1000 <= Date.now()) return null;

  return {
    subject: payload.sub,
    email: payload.email,
    name: payload.name,
    pictureUrl: payload.pictureUrl,
  };
}

async function authRequest(
  path: "/auth/login" | "/auth/register",
  body: Record<string, string>,
) {
  if (!authBaseUrl) throw new Error("Missing VITE_CONVEX_SITE_URL");

  const response = await fetch(`${authBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as {
    token?: string;
    user?: AuthUser;
    error?: string;
  };

  if (!response.ok || !data.token || !data.user) {
    throw new Error(data.error || "Authentication failed.");
  }

  return data;
}

export function SelfHostedAuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const storedUser = stored ? userFromToken(stored) : null;
    if (stored && storedUser) {
      setToken(stored);
      setUser(storedUser);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setIsLoading(false);
  }, []);

  const acceptSession = useCallback((nextToken: string, nextUser: AuthUser) => {
    window.localStorage.setItem(STORAGE_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const signIn = useCallback(
    async (input: { email: string; password: string }) => {
      const data = await authRequest("/auth/login", input);
      acceptSession(data.token!, data.user!);
    },
    [acceptSession],
  );

  const signUp = useCallback(
    async (input: { email: string; name: string; password: string }) => {
      const data = await authRequest("/auth/register", input);
      acceptSession(data.token!, data.user!);
    },
    [acceptSession],
  );

  const signOut = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ isLoading, token, user, signIn, signUp, signOut }),
    [isLoading, signIn, signOut, signUp, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useSelfHostedAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useSelfHostedAuth must be used inside SelfHostedAuthProvider");
  return value;
}

export function useSelfHostedAuthForConvex() {
  const { isLoading, token, user } = useSelfHostedAuth();
  const fetchAccessToken = useCallback(async () => token, [token]);

  return useMemo(
    () => ({
      isLoading,
      isAuthenticated: Boolean(user && token),
      fetchAccessToken,
    }),
    [fetchAccessToken, isLoading, token, user],
  );
}
