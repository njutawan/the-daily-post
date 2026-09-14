/**
 * Module-level bridge for Clerk's signOut function.
 *
 * Set by <ClerkSignOutBridge> (which runs inside <ClerkProvider> and can
 * safely call useClerk()). Read by UnifiedAuthProvider's signOut() so
 * it can destroy the Clerk session when the user signs out.
 */

type ClerkSignOutFn = (opts?: {
  redirectUrl?: string;
  navigate?: (to: string | URL) => void;
}) => Promise<void> | void;

export const clerkBridge: {
  signOut: ClerkSignOutFn | null;
} = {
  signOut: null,
};
