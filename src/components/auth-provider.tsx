"use client";

import { ClerkProvider, useClerk } from "@clerk/nextjs";
import { useEffect } from "react";
import { clerkBridge } from "@/lib/clerk-bridge";

/**
 * AuthProvider — Clerk-only authentication wrapper.
 *
 * Always mounts <ClerkProvider> so Clerk's auth context is available
 * across the entire app. <ClerkSignOutBridge> exposes Clerk's signOut
 * to the unified auth context via the module-level clerkBridge holder.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ClerkSignOutBridge />
      {children}
    </ClerkProvider>
  );
}

function ClerkSignOutBridge() {
  const { signOut } = useClerk();
  useEffect(() => {
    clerkBridge.signOut = signOut;
    return () => {
      clerkBridge.signOut = null;
    };
  }, [signOut]);
  return null;
}
