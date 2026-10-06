"use client";

import { ClerkProvider, useClerk } from "@clerk/nextjs";
import { useEffect } from "react";
import { clerkBridge } from "@/lib/clerk-bridge";

/**
 * AuthProvider — Clerk-only authentication wrapper.
 *
 * Mounts <ClerkProvider> so Clerk's auth context is available across
 * the entire app. <ClerkSignOutBridge> exposes Clerk's signOut to the
 * unified auth context via the module-level clerkBridge holder.
 *
 * When NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set (fresh clone,
 * offline sandbox), <ClerkProvider> would throw and take down every
 * page. In that case we render children without the provider — the
 * app behaves as fully signed-out until keys are configured.
 */
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!clerkPublishableKey) {
    return <>{children}</>;
  }
  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
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
