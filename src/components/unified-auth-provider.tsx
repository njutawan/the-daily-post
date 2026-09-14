"use client";

/**
 * Client-side auth context that mirrors Clerk's `useUser()` / `useAuth()`
 * API surface so components can be written once and work with Clerk.
 *
 * On mount it fetches the current session from /api/auth/me (which
 * calls getSessionUser() and resolves the Clerk session server-side).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { clerkBridge } from "@/lib/clerk-bridge";

export type Role = "reader" | "editor" | "admin";
export type SubTier = "free" | "digital" | "allaccess";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  subTier: SubTier;
  subStatus: string;
  subExpiresAt: string | null;
  avatarUrl: string | null;
  clerkId: string | null;
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  isSignedIn: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isSignedIn: false,
  refresh: async () => {},
  signOut: async () => {},
});

export function UnifiedAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = await res.json();
      setUser(data.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    // Tear down the Clerk session via the clerkBridge (populated by
    // <ClerkSignOutBridge> inside <ClerkProvider>). Clerk handles the
    // session cookie invalidation and the redirect to the post-signout URL.
    setUser(null);
    if (clerkBridge.signOut) {
      try {
        await clerkBridge.signOut({ redirectUrl: "/" });
        return;
      } catch {
        // fall through to local refresh
      }
    }
    router.push("/");
    router.refresh();
  }, [router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isSignedIn: user !== null,
        refresh,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useUnifiedAuth() {
  return useContext(AuthContext);
}
